import type { CreateCardRequest } from '@/lib/moderation';
import { moderateCard } from '@/lib/server/gemini';
import {
  CardError,
  errorResponse,
  insertFileRows,
  json,
  loadFiles,
  subjectId,
  subjectNames,
  topic,
  uploadedFiles,
} from '@/lib/server/cards';
import { supabaseAdmin, userFromRequest } from '@/lib/server/supabaseAdmin';

/** The AI check takes a few seconds; Gemini itself is cut off after 25 s. */
export const maxDuration = 60;

/**
 * POST /api/cards: publish a new card after the AI check.
 * Students cannot insert cards themselves (20261102120000_ai_moderation.sql), so every
 * card passes through here.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const db = supabaseAdmin();
    if (!db) throw new CardError('server', 500, 'SUPABASE_SERVICE_ROLE_KEY is not set');
    const userId = await userFromRequest(db, request);
    if (!userId) throw new CardError('auth', 401);

    const body = (await request.json().catch(() => null)) as Partial<CreateCardRequest> | null;
    if (!body) throw new CardError('invalid', 400, 'body');
    const neededId = subjectId(body.neededSubjectId);
    const offeredId = subjectId(body.offeredSubjectId);
    if (neededId === offeredId) throw new CardError('invalid', 400, 'same subject');
    const neededTopic = topic(body.neededTopic);
    const offeredTopic = topic(body.offeredTopic);
    const contactMethod = body.contactMethod;
    if (contactMethod !== 'email' && contactMethod !== 'telegram') throw new CardError('invalid', 400, 'contact');
    const files = uploadedFiles(body.files, userId);

    const { data: me, error: meError } = await db
      .from('users')
      .select('id, telegram_handle')
      .eq('id', userId)
      .maybeSingle();
    if (meError) throw meError;
    if (!me) throw new CardError('profile', 403);
    if (contactMethod === 'telegram' && !me.telegram_handle) throw new CardError('invalid', 400, 'no telegram');

    const [names, loaded] = await Promise.all([subjectNames(db, [neededId, offeredId]), loadFiles(db, files)]);

    const verdict = await moderateCard({
      neededSubject: names.get(neededId)!,
      neededTopic,
      offeredSubject: names.get(offeredId)!,
      offeredTopic,
      files: loaded.map((file) => file.moderation),
    });
    if (verdict.verdict === 'reject') {
      return json({ result: 'rejected', category: verdict.category, field: verdict.field, file: verdict.file });
    }
    if (verdict.verdict === 'unavailable') console.warn('AI check unavailable, card goes to the moderator:', verdict.reason);

    const status = verdict.verdict === 'ok' ? 'active' : 'pending';
    const { data: post, error: postError } = await db
      .from('barter_posts')
      .insert({
        author_id: userId,
        needed_subject_id: neededId,
        offered_subject_id: offeredId,
        description: neededTopic,
        offered_description: offeredTopic,
        contact_method: contactMethod,
        status,
      })
      .select('id')
      .single();
    if (postError) throw postError;

    try {
      await insertFileRows(db, post.id as string, userId, loaded);
    } catch (err: unknown) {
      // Never leave a card without the files the student attached.
      await db.from('barter_posts').delete().eq('id', post.id);
      throw err;
    }

    return json({ result: status === 'active' ? 'published' : 'pending', id: post.id as string });
  } catch (err: unknown) {
    return errorResponse(err);
  }
}
