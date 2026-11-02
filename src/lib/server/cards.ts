import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CardCheckResponse, CardErrorCode, UploadedFile } from '@/lib/moderation';
import type { ModerationFile } from '@/lib/server/gemini';

/**
 * Checks and writes for /api/cards. The limits repeat the database rules
 * (20261029120000_polish.sql, 20261029200000_card_files.sql), so a bad request gets a
 * clear answer before anything is sent to the AI.
 */

const BUCKET = 'card-files';
export const TOPIC_MAX = 150;
export const MAX_FILES = 3;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MIME = { webp: 'image/webp', jpg: 'image/jpeg', pdf: 'application/pdf' } as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** A request the route answers with { result: 'error' }. */
export class CardError extends Error {
  constructor(
    readonly code: CardErrorCode,
    readonly status: number,
    message: string = code,
  ) {
    super(message);
  }
}

export function json(body: CardCheckResponse, status = 200): Response {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}

export function errorResponse(err: unknown): Response {
  if (err instanceof CardError) return json({ result: 'error', error: err.code }, err.status);
  console.error('Card request failed:', err);
  return json({ result: 'error', error: 'server' }, 500);
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}

/** A topic text as stored: trimmed, 1–150 characters. */
export function topic(value: unknown): string {
  if (typeof value !== 'string') throw new CardError('invalid', 400, 'topic is not text');
  const text = value.trim();
  if (text.length < 1 || text.length > TOPIC_MAX) throw new CardError('invalid', 400, 'topic length');
  return text;
}

export function subjectId(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new CardError('invalid', 400, 'subject id');
  }
  return value;
}

/** Name shown on the card: without control characters, at most 120. */
function cleanName(value: unknown): string {
  const name = typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 120) : '';
  return name || 'file';
}

/** Files uploaded by this student: <student id>/<uuid>.<webp|jpg|pdf>, each once. */
export function uploadedFiles(value: unknown, userId: string): UploadedFile[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_FILES) throw new CardError('invalid', 400, 'files');
  const pattern = new RegExp(`^${userId}/[0-9a-f-]{36}\\.(webp|jpg|pdf)$`);
  const seen = new Set<string>();
  return value.map((item: unknown) => {
    const file = (item ?? {}) as Record<string, unknown>;
    const path = typeof file.path === 'string' ? file.path : '';
    const match = pattern.exec(path);
    if (!match || seen.has(path)) throw new CardError('invalid', 400, 'file path');
    seen.add(path);
    const kind = match[1] === 'pdf' ? 'pdf' : 'image';
    if (file.kind !== kind) throw new CardError('invalid', 400, 'file kind');
    return { path, kind, name: cleanName(file.name) };
  });
}

export interface LoadedFile extends UploadedFile {
  size: number;
  moderation: ModerationFile;
}

/** Downloads the files from Storage for the AI (they must not be on a card already). */
export async function loadFiles(db: SupabaseClient, files: UploadedFile[]): Promise<LoadedFile[]> {
  if (files.length === 0) return [];
  const { data: taken, error: takenError } = await db
    .from('card_files')
    .select('path')
    .in(
      'path',
      files.map((file) => file.path),
    );
  if (takenError) throw takenError;
  if ((taken ?? []).length > 0) throw new CardError('invalid', 400, 'file already attached');

  return Promise.all(
    files.map(async (file) => {
      const { data, error } = await db.storage.from(BUCKET).download(file.path);
      if (error || !data) throw new CardError('files', 400, `cannot read ${file.path}`);
      const bytes = Buffer.from(await data.arrayBuffer());
      if (bytes.length < 1 || bytes.length > MAX_FILE_BYTES) throw new CardError('files', 400, 'file size');
      const extension = file.path.slice(file.path.lastIndexOf('.') + 1) as keyof typeof MIME;
      return {
        ...file,
        size: bytes.length,
        moderation: { mimeType: MIME[extension], kind: file.kind, base64: bytes.toString('base64') },
      };
    }),
  );
}

/** Adds the file rows to a card (the server sets the author: there is no signed-in user here). */
export async function insertFileRows(db: SupabaseClient, postId: string, authorId: string, files: LoadedFile[]) {
  if (files.length === 0) return;
  const { error } = await db.from('card_files').insert(
    files.map((file) => ({
      post_id: postId,
      author_id: authorId,
      path: file.path,
      name: file.name,
      kind: file.kind,
      size_bytes: file.size,
    })),
  );
  if (error) throw error;
}

/** Subject names for the AI, by id. Missing ids are an invalid request. */
export async function subjectNames(db: SupabaseClient, ids: number[]): Promise<Map<number, string>> {
  const { data, error } = await db.from('subjects').select('id, code, name').in('id', ids);
  if (error) throw error;
  const names = new Map<number, string>();
  for (const row of (data ?? []) as { id: number; code: string; name: string }[]) {
    names.set(row.id, `${row.name} (${row.code})`);
  }
  if (ids.some((id) => !names.has(id))) throw new CardError('invalid', 400, 'unknown subject');
  return names;
}

/** Removes files from Storage (best effort: an orphaned file does no harm). */
export async function removeStored(db: SupabaseClient, paths: string[]) {
  if (paths.length === 0) return;
  const { error } = await db.storage.from(BUCKET).remove(paths);
  if (error) console.error('Could not remove card files:', error);
}
