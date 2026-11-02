import type { EditCardRequest } from '@/lib/moderation';
import { moderateCard } from '@/lib/server/gemini';
import {
  CardError,
  errorResponse,
  insertFileRows,
  isUuid,
  json,
  loadFiles,
  MAX_FILES,
  removeStored,
  subjectNames,
  takeAiCheck,
  topic,
  uploadedFiles,
} from '@/lib/server/cards';
import { supabaseAdmin, userFromRequest } from '@/lib/server/supabaseAdmin';

export const maxDuration = 60;

/**
 * PATCH /api/cards/<id>: edit the topics and files of one of my cards (Profile → Manage).
 * New topic texts and new files are checked by the AI first; files already on the card
 * were checked when they were added. Only removing files needs no check.
 */
export async function PATCH(request: Request, ctx: RouteContext<'/api/cards/[id]'>): Promise<Response> {
  try {
    const db = supabaseAdmin();
    if (!db) throw new CardError('server', 500, 'SUPABASE_SERVICE_ROLE_KEY is not set');
    const userId = await userFromRequest(db, request);
    if (!userId) throw new CardError('auth', 401);

    const { id } = await ctx.params;
    if (!isUuid(id)) throw new CardError('not-found', 404);

    const body = (await request.json().catch(() => null)) as Partial<EditCardRequest> | null;
    if (!body) throw new CardError('invalid', 400, 'body');
    const neededTopic = topic(body.neededTopic);
    const offeredTopic = topic(body.offeredTopic);
    const files = uploadedFiles(body.files, userId);
    const removeIds = Array.isArray(body.removeFiles) ? body.removeFiles : [];
    if (!removeIds.every(isUuid)) throw new CardError('invalid', 400, 'remove ids');

    const { data: post, error: postError } = await db
      .from('barter_posts')
      .select('id, author_id, status, description, offered_description, needed_subject_id, offered_subject_id')
      .eq('id', id)
      .maybeSingle();
    if (postError) throw postError;
    if (!post || post.author_id !== userId) throw new CardError('not-found', 404);

    const { data: current, error: filesError } = await db.from('card_files').select('id, path').eq('post_id', id);
    if (filesError) throw filesError;
    const currentFiles = (current ?? []) as { id: string; path: string }[];
    const removed = currentFiles.filter((file) => removeIds.includes(file.id));
    if (removed.length !== new Set(removeIds).size) throw new CardError('invalid', 400, 'unknown file');
    if (currentFiles.length - removed.length + files.length > MAX_FILES) throw new CardError('invalid', 400, 'too many files');

    const textChanged = neededTopic !== post.description || offeredTopic !== post.offered_description;
    let status = post.status as string;

    if (textChanged || files.length > 0) {
      const limited = await takeAiCheck(db, userId);
      if (limited) return limited;

      const [names, loaded] = await Promise.all([
        subjectNames(db, [post.needed_subject_id as number, post.offered_subject_id as number]),
        loadFiles(db, files),
      ]);
      const verdict = await moderateCard({
        neededSubject: names.get(post.needed_subject_id as number)!,
        neededTopic,
        offeredSubject: names.get(post.offered_subject_id as number)!,
        offeredTopic,
        files: loaded.map((file) => file.moderation),
      });
      if (verdict.verdict === 'reject') {
        return json({ result: 'rejected', category: verdict.category, field: verdict.field, file: verdict.file });
      }
      if (verdict.verdict === 'unavailable') {
        console.warn('AI check unavailable, card hidden until a moderator checks it:', verdict.reason);
        status = 'pending';
      }

      const { error: updateError } = await db
        .from('barter_posts')
        .update({ description: neededTopic, offered_description: offeredTopic, status })
        .eq('id', id);
      if (updateError) throw updateError;
      await removeFiles(db, removed);
      await insertFileRows(db, id, userId, loaded);
    } else {
      await removeFiles(db, removed);
    }

    return status === 'pending' && post.status !== 'pending'
      ? json({ result: 'pending', id })
      : json({ result: 'saved' });
  } catch (err: unknown) {
    return errorResponse(err);
  }
}

/** Takes files off the card (first, so their places are free for the new ones). */
async function removeFiles(db: NonNullable<ReturnType<typeof supabaseAdmin>>, files: { id: string; path: string }[]) {
  if (files.length === 0) return;
  const { error } = await db
    .from('card_files')
    .delete()
    .in(
      'id',
      files.map((file) => file.id),
    );
  if (error) throw error;
  await removeStored(
    db,
    files.map((file) => file.path),
  );
}
