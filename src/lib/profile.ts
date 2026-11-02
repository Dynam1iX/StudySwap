import { getInitials, getShortName } from '@/lib/format';
import { fetchMyCardFiles, listMyStoredFiles, removeStoredFiles, type CardFile } from '@/lib/cardFiles';
import { supabase } from '@/lib/supabase';
import type { DegreeLevel, PostStatus, StudyYear, Subject, User } from '@/types/database';
import type { Messages } from '@/i18n';

export type ProfileSubject = Pick<Subject, 'id' | 'code' | 'name' | 'category'>;

export interface ProfileCard {
  id: string;
  status: PostStatus;
  needed: ProfileSubject;
  offered: ProfileSubject;
  /** What the student needs help with (barter_posts.description). */
  neededTopic: string;
  /** What the student can teach (barter_posts.offered_description). */
  offeredTopic: string;
  /** Photos / PDFs with the tasks ("Needs help" side), oldest first. */
  files: CardFile[];
}

export interface ProfileUser {
  id: string;
  fullName: string;
  /** Split from full_name at the first space (the database keeps one field). */
  firstName: string;
  lastName: string;
  email: string;
  degree: DegreeLevel;
  /** "Alzhan Y." */
  displayName: string;
  initials: string;
  major: string;
  /** null for a teacher. */
  studyYear: StudyYear | null;
  /** Without the leading "@"; null when the student has not linked Telegram. */
  telegramHandle: string | null;
  /** Storage path of the photo, or null. */
  avatarPath: string | null;
}

export interface ProfileData {
  user: ProfileUser;
  needsHelp: ProfileSubject[];
  canTeach: ProfileSubject[];
  cards: ProfileCard[];
}

type UserRow = Pick<
  User,
  'id' | 'full_name' | 'email' | 'telegram_handle' | 'major' | 'study_year' | 'degree_level' | 'avatar_path'
>;

/**
 * The signed-in student's own row. Other students' e-mails, settings and handles are not
 * readable from the users table, so your own comes from get_my_profile().
 */
export async function fetchMyProfileRow(): Promise<UserRow | null> {
  const { data, error } = await supabase.rpc('get_my_profile').maybeSingle();
  if (error) throw error;
  return (data as UserRow | null) ?? null;
}

/** A row of get_my_cards(). */
interface PostRow {
  id: string;
  status: PostStatus;
  created_at: string;
  description: string | null;
  offered_description: string | null;
  needed: ProfileSubject | null;
  offered: ProfileSubject | null;
}

/** "Alzhan Yerzhanuly" -> ["Alzhan", "Yerzhanuly"]; one word -> [word, ""]. */
function splitName(fullName: string): [string, string] {
  const trimmed = fullName.trim();
  const space = trimmed.indexOf(' ');
  return space === -1 ? [trimmed, ''] : [trimmed.slice(0, space), trimmed.slice(space + 1).trim()];
}

function toStudyYear(value: number | null | undefined): StudyYear | null {
  if (value == null) return null; // teacher
  return value === 2 || value === 3 ? value : 1;
}

/** Unique subjects in the order they first appear. */
function uniqueSubjects(subjects: ProfileSubject[]): ProfileSubject[] {
  const seen = new Set<number>();
  return subjects.filter((subject) => {
    if (seen.has(subject.id)) return false;
    seen.add(subject.id);
    return true;
  });
}

/**
 * Loads everything the profile page shows. The student's own cards come from
 * get_my_cards(), which also returns inactive (archived) ones that RLS hides elsewhere.
 */
export async function fetchProfile(): Promise<ProfileData | null> {
  const userRow = await fetchMyProfileRow();
  if (!userRow) return null;

  const [{ data: postData, error: postsError }, files] = await Promise.all([
    supabase.rpc('get_my_cards'),
    fetchMyCardFiles(),
  ]);

  if (postsError) throw postsError;

  const cards: ProfileCard[] = ((postData ?? []) as unknown as PostRow[]).flatMap((row) =>
    row.needed && row.offered
      ? [
          {
            id: row.id,
            status: row.status,
            needed: row.needed,
            offered: row.offered,
            neededTopic: row.description?.trim() ?? '',
            offeredTopic: row.offered_description?.trim() ?? '',
            files: files.get(row.id) ?? [],
          },
        ]
      : [],
  );

  const [firstName, lastName] = splitName(userRow.full_name);
  // Inactive cards stay in My cards but do not count as subjects the student needs or teaches.
  const activeCards = cards.filter((card) => card.status === 'active');

  return {
    user: {
      id: userRow.id,
      fullName: userRow.full_name,
      firstName,
      lastName,
      email: userRow.email,
      degree: userRow.degree_level || 'Undergraduate',
      displayName: getShortName(userRow.full_name),
      initials: getInitials(userRow.full_name),
      major: userRow.major || 'Software Engineering',
      studyYear: toStudyYear(userRow.study_year),
      telegramHandle: userRow.telegram_handle?.replace(/^@/, '') || null,
      avatarPath: userRow.avatar_path ?? null,
    },
    // No user_subjects table yet, so both lists come from the student's own cards.
    needsHelp: uniqueSubjects(activeCards.map((card) => card.needed)),
    canTeach: uniqueSubjects(activeCards.map((card) => card.offered)),
    cards,
  };
}

// ---------------------------------------------------------------------------
// Changes (Supabase functions that act only on the current student)
// ---------------------------------------------------------------------------

/** "Bachelor's" / "Master's" / "PhD" for the degree_level values, in the interface language. */
export function degreeLabel(t: Messages, degree: DegreeLevel): string {
  return t.degree[degree] ?? t.degree.Undergraduate;
}

export async function setMyCardStatus(id: string, status: 'active' | 'archived'): Promise<void> {
  const { error } = await supabase.rpc('set_my_card_status', { p_id: id, p_status: status });
  if (error) throw error;
}

/** Deletes the card (its file rows go with it), then its files in Storage. */
export async function deleteMyCard(id: string, files: CardFile[] = []): Promise<void> {
  const { error } = await supabase.rpc('delete_my_card', { p_id: id });
  if (error) throw error;
  await removeStoredFiles(files.map((file) => file.path));
}

/** Everything stored about the student, saved as studyswap-my-data.json. */
export async function downloadMyData(): Promise<void> {
  const { data, error } = await supabase.rpc('export_my_data');
  if (error) throw error;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'studyswap-my-data.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Later, not at once: iOS Safari may still be reading the file.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Deletes the signed-in student for good. Every file in the student's photo folder is
 * removed first, not only the current photo (an interrupted upload can leave another
 * one): the photo rules need the profile row, so after the account is gone the files
 * could no longer be removed. Then everything in the database and the sign-in account.
 */
export async function deleteMyAccount(userId: string): Promise<void> {
  const { data: files } = await supabase.storage.from('avatars').list(userId, { limit: 100 });
  const paths = (files ?? []).map((file) => `${userId}/${file.name}`);
  if (paths.length > 0) {
    const { error: removeError } = await supabase.storage.from('avatars').remove(paths);
    if (removeError) console.error('Could not remove the photo files:', removeError);
  }
  // Files on the cards (photos / PDFs of tasks): same reason, before the profile goes.
  await removeStoredFiles(await listMyStoredFiles(userId));
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw error;
}
