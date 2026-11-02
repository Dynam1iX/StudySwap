'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { messages } from '@/i18n';
import type { UploadedFile } from '@/lib/moderation';

/**
 * Files on a card ("Needs help" side): photos or PDFs with the exact tasks.
 * See supabase/migrations/20261029200000_card_files.sql.
 */
const BUCKET = 'card-files';

/** At most this many files per card (the database checks it too). */
export const MAX_CARD_FILES = 3;
/** Largest file after compression, in bytes (the bucket allows the same). */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
/** Longest side of a stored photo, in px: tasks stay readable, files stay small. */
const PHOTO_MAX_SIDE = 2000;
const QUALITY = 0.85;
/** File chooser filter: photos and PDFs. */
export const FILE_ACCEPT = 'image/*,application/pdf,.pdf';

export type CardFileKind = 'image' | 'pdf';

/** A file already on a card. */
export interface CardFile {
  id: string;
  path: string;
  name: string;
  kind: CardFileKind;
  created_at: string;
}

/** A file picked in the form, ready to upload (photos already compressed). */
export interface PreparedFile {
  /** Local key for lists. */
  key: string;
  blob: Blob;
  name: string;
  kind: CardFileKind;
  extension: 'webp' | 'jpg' | 'pdf';
  /** Object URL of a photo for the thumbnail; revoke when done. */
  previewUrl: string | null;
}

/** Oldest first: the order they were attached. */
export function sortFiles<T extends { created_at: string }>(files: T[] | null | undefined): T[] {
  return [...(files ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(messages().files.unreadable(file.name)));
    };
    image.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}

/** Name shown on the card: the original one, without odd characters, at most 120. */
function cleanName(name: string): string {
  return name.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 120) || 'file';
}

/**
 * Checks a picked file and gets it ready: a photo is scaled to at most 2000 px on the
 * long side and re-encoded as WebP (JPEG where WebP cannot be encoded), which also drops
 * its location data; a PDF is kept as it is.
 */
export async function prepareCardFile(file: File): Promise<PreparedFile> {
  const t = messages().files;
  const key = crypto.randomUUID();

  if (isPdf(file)) {
    if (file.size > MAX_FILE_BYTES) throw new Error(t.tooBig(file.name));
    return { key, blob: file, name: cleanName(file.name), kind: 'pdf', extension: 'pdf', previewUrl: null };
  }
  if (!file.type.startsWith('image/')) throw new Error(t.wrongType(file.name));

  const image = await loadImage(file);
  const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error(t.unreadable(file.name));
  // White under transparent PNGs (screenshots), so text stays readable as JPEG.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  let blob = await toBlob(canvas, 'image/webp');
  let extension: PreparedFile['extension'] = 'webp';
  if (!blob || blob.type !== 'image/webp') {
    blob = await toBlob(canvas, 'image/jpeg');
    extension = 'jpg';
  }
  if (!blob) throw new Error(t.unreadable(file.name));
  if (blob.size > MAX_FILE_BYTES) throw new Error(t.tooBig(file.name));

  return { key, blob, name: cleanName(file.name), kind: 'image', extension, previewUrl: URL.createObjectURL(blob) };
}

const CONTENT_TYPE = { webp: 'image/webp', jpg: 'image/jpeg', pdf: 'application/pdf' } as const;

/** Removes files from Storage (best effort: an orphaned file does no harm). */
export async function removeStoredFiles(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  if (error) console.error('Could not remove card files:', error);
}

/**
 * Uploads the files to <student id>/<uuid>.<ext>. They are not on a card yet: the server
 * attaches them after the AI check (/api/cards). All or nothing: if one upload fails,
 * the ones already uploaded are removed again.
 */
export async function uploadFiles(userId: string, files: PreparedFile[]): Promise<UploadedFile[]> {
  const uploaded: UploadedFile[] = [];
  try {
    for (const file of files) {
      const path = `${userId}/${crypto.randomUUID()}.${file.extension}`;
      // Some phones give a PDF without a type: the bucket only takes the three it knows.
      const body = new Blob([file.blob], { type: CONTENT_TYPE[file.extension] });
      const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
        contentType: CONTENT_TYPE[file.extension],
        cacheControl: '31536000',
        upsert: false,
      });
      if (error) throw error;
      uploaded.push({ path, name: file.name, kind: file.kind });
    }
    return uploaded;
  } catch (err: unknown) {
    await removeStoredFiles(uploaded.map((item) => item.path));
    throw err;
  }
}

/** Files on my own cards (also inactive ones), grouped by card. */
export async function fetchMyCardFiles(): Promise<Map<string, CardFile[]>> {
  const { data, error } = await supabase
    .from('card_files')
    .select('id, post_id, path, name, kind, created_at')
    .eq('author_id', (await supabase.auth.getSession()).data.session?.user.id ?? '');
  if (error) throw error;
  const byCard = new Map<string, CardFile[]>();
  for (const row of sortFiles((data ?? []) as (CardFile & { post_id: string })[])) {
    const { post_id: postId, ...file } = row;
    byCard.set(postId, [...(byCard.get(postId) ?? []), file]);
  }
  return byCard;
}

/** Every file in my folder (also ones an interrupted upload left behind). */
export async function listMyStoredFiles(userId: string): Promise<string[]> {
  const { data } = await supabase.storage.from(BUCKET).list(userId, { limit: 1000 });
  return (data ?? []).map((file) => `${userId}/${file.name}`);
}

// ---------------------------------------------------------------------------
// Links. The bucket is private: links are signed for signed-in students.
// ---------------------------------------------------------------------------

const LINK_SECONDS = 60 * 60;
const RENEW_MS = 5 * 60 * 1000;
const signed = new Map<string, { url: string; expires: number }>();

function cachedUrl(path: string): string | null {
  const hit = signed.get(path);
  return hit && hit.expires - RENEW_MS > Date.now() ? hit.url : null;
}

async function signPaths(paths: string[]): Promise<void> {
  const missing = paths.filter((path) => !cachedUrl(path));
  if (missing.length === 0) return;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(missing, LINK_SECONDS);
  if (error) {
    console.error('Could not sign card file links:', error);
    return;
  }
  const expires = Date.now() + LINK_SECONDS * 1000;
  for (const row of data ?? []) {
    if (row.path && row.signedUrl) signed.set(row.path, { url: row.signedUrl, expires });
  }
}

/** Signed links for the files (path → url), filled in once signed. */
export function useCardFileUrls(paths: string[]): Record<string, string> {
  const key = paths.join('|');
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    const list = key ? key.split('|') : [];
    void signPaths(list).then(() => {
      if (cancelled) return;
      const next: Record<string, string> = {};
      for (const path of list) {
        const url = cachedUrl(path);
        if (url) next[path] = url;
      }
      setUrls(next);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);
  return urls;
}
