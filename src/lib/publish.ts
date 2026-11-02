'use client';

import { useCallback, useEffect, useRef } from 'react';
import { removeStoredFiles, uploadFiles, type PreparedFile } from '@/lib/cardFiles';
import type {
  CardCheckResponse,
  CreateCardRequest,
  EditCardRequest,
  UploadedFile,
  Violation,
  ViolationField,
} from '@/lib/moderation';
import { supabase } from '@/lib/supabase';

/**
 * Publishing and editing a card go through the server (/api/cards), which checks the
 * topics and files with the AI first. See src/lib/moderation.ts for the answers.
 */

async function send(url: string, method: 'POST' | 'PATCH', body: unknown): Promise<CardCheckResponse> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { result: 'error', error: 'auth' };
  try {
    const response = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const answer = (await response.json().catch(() => null)) as CardCheckResponse | null;
    if (answer && typeof answer === 'object' && 'result' in answer) return answer;
  } catch (err: unknown) {
    console.error('Card request failed:', err);
  }
  return { result: 'error', error: 'server' };
}

export function createCard(request: CreateCardRequest): Promise<CardCheckResponse> {
  return send('/api/cards', 'POST', request);
}

export function editCard(id: string, request: EditCardRequest): Promise<CardCheckResponse> {
  return send(`/api/cards/${encodeURIComponent(id)}`, 'PATCH', request);
}

/** What the form shows after a rejection: the reason and the part to fix. */
export interface Rejection {
  category: Violation;
  field: ViolationField | null;
  /** Key of the flagged attachment in the form (field 'file'). */
  fileKey: string | null;
}

/** The card was not saved: the AI found a problem. */
export class CardRejectedError extends Error {
  constructor(readonly rejection: Rejection) {
    super(rejection.category);
  }
}

/**
 * Uploads each picked file once per form: after a rejection the student fixes a topic and
 * presses Publish again without sending the same photos twice. Uploads of files taken out
 * of the form, or left behind when the form closes without saving, are removed again.
 */
export function useFileUploads() {
  const cache = useRef(new Map<string, UploadedFile>());

  /** Uploads what is not uploaded yet; returns the files in the same order. */
  const upload = useCallback(async (userId: string, files: PreparedFile[]): Promise<UploadedFile[]> => {
    const missing = files.filter((file) => !cache.current.has(file.key));
    if (missing.length > 0) {
      const done = await uploadFiles(userId, missing);
      missing.forEach((file, index) => cache.current.set(file.key, done[index]));
    }
    return files.map((file) => cache.current.get(file.key)!);
  }, []);

  /** Removes the uploads of files that are no longer in the form. */
  const keepOnly = useCallback((keys: string[]) => {
    const keep = new Set(keys);
    const gone = [...cache.current].filter(([key]) => !keep.has(key));
    if (gone.length === 0) return;
    for (const [key] of gone) cache.current.delete(key);
    void removeStoredFiles(gone.map(([, file]) => file.path));
  }, []);

  /** The files are on the card now: forget them without deleting. */
  const settle = useCallback(() => cache.current.clear(), []);

  useEffect(() => {
    const uploads = cache.current;
    return () => {
      // The form closed (or Next hid the page) without saving: nothing is attached to them.
      void removeStoredFiles([...uploads.values()].map((file) => file.path));
      uploads.clear();
    };
  }, []);

  return { upload, keepOnly, settle };
}
