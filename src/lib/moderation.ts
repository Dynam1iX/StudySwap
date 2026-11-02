/**
 * AI check of a card before it is published or edited: shapes shared by the browser
 * (src/lib/publish.ts) and the server (/api/cards, src/lib/server/*).
 * See supabase/migrations/20261102120000_ai_moderation.sql.
 */

/** What the AI may reject a card for (the student sees a fixed text per category). */
export const VIOLATIONS = ['abuse', 'money', 'cheating', 'spam'] as const;
export type Violation = (typeof VIOLATIONS)[number];

/** The part of the card the AI objected to: a topic text or one of the attached files. */
export type ViolationField = 'needed' | 'offered' | 'file';

/** A file the browser already put into card-files/<student id>/, sent to the server by path. */
export interface UploadedFile {
  path: string;
  name: string;
  kind: 'image' | 'pdf';
}

/** POST /api/cards */
export interface CreateCardRequest {
  neededSubjectId: number;
  offeredSubjectId: number;
  neededTopic: string;
  offeredTopic: string;
  contactMethod: 'email' | 'telegram';
  files: UploadedFile[];
}

/**
 * PATCH /api/cards/<id>: the topic texts, newly added files and the ids of files to take
 * off. Everything is saved together, and only after the check, so a rejected edit leaves
 * the card exactly as it was.
 */
export interface EditCardRequest {
  neededTopic: string;
  offeredTopic: string;
  files: UploadedFile[];
  removeFiles: string[];
}

/**
 * Answer of both routes:
 * - published / saved: the AI allowed it;
 * - pending: the AI could not answer, the card is hidden until an administrator checks it;
 * - rejected: nothing was written; `file` is the index in the `files` sent (field 'file').
 */
export type CardCheckResponse =
  | { result: 'published'; id: string }
  | { result: 'saved' }
  | { result: 'pending'; id: string }
  | { result: 'rejected'; category: Violation; field: ViolationField | null; file: number | null }
  | { result: 'error'; error: CardErrorCode };

/** Errors the browser turns into a message. */
export type CardErrorCode = 'auth' | 'profile' | 'invalid' | 'files' | 'not-found' | 'server';
