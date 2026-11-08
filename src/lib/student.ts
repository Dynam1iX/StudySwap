import { supabase } from '@/lib/supabase';
import { attachContacts, FEED_POST_SELECT, type FeedAuthor, type FeedPost, type PostContact } from '@/lib/feed';
import { fetchBio, type ProfileSubject } from '@/lib/profile';
import type { PostStatus } from '@/types/database';

/** Another student as their profile page (/u/[id]) shows them. */
export interface StudentProfile {
  author: FeedAuthor;
  /** Telegram when the caller may see it, otherwise the university e-mail; null when neither. */
  contact: PostContact | null;
  /** Their "About me"; '' when empty. */
  bio: string;
  /** Their active cards, newest first. */
  cards: FeedPost[];
  needsHelp: ProfileSubject[];
  canTeach: ProfileSubject[];
  /** Subjects of the signed-in student's own active cards, for "Can help you with". */
  mine: { needsHelp: ProfileSubject[]; canTeach: ProfileSubject[] };
}

/** Link to a student's page; your own page is the Profile tab. */
export function studentHref(id: string, myId: string | null): string {
  return id === myId ? '/profile' : `/u/${id}`;
}

// ---------------------------------------------------------------------------
// The header is shown at once from the card you tapped, while the rest loads.
// ---------------------------------------------------------------------------
const known = new Map<string, FeedAuthor>();

export function rememberStudent(author: FeedAuthor): void {
  known.set(author.id, author);
}

export function knownStudent(id: string): FeedAuthor | null {
  return known.get(id) ?? null;
}

/** Unique subjects in the order they first appear. */
function unique(subjects: (ProfileSubject | null | undefined)[]): ProfileSubject[] {
  const seen = new Set<number>();
  const out: ProfileSubject[] = [];
  for (const subject of subjects) {
    if (!subject || seen.has(subject.id)) continue;
    seen.add(subject.id);
    out.push(subject);
  }
  return out;
}

interface StudentRow extends FeedAuthor {
  contact_method: 'telegram' | 'email' | null;
  contact: string | null;
}

interface MyCardRow {
  status: PostStatus;
  needed: ProfileSubject | null;
  offered: ProfileSubject | null;
}

/** Everything the page needs, or null when there is no such student. */
export async function fetchStudent(id: string): Promise<StudentProfile | null> {
  const [studentRes, postsRes, mineRes, bio] = await Promise.all([
    supabase.rpc('get_student_profile', { p_id: id }).maybeSingle(),
    supabase
      .from('barter_posts')
      .select(FEED_POST_SELECT)
      .eq('author_id', id)
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
    supabase.rpc('get_my_cards'),
    fetchBio(id),
  ]);
  if (studentRes.error) throw studentRes.error;
  if (postsRes.error) throw postsRes.error;
  if (mineRes.error) throw mineRes.error;

  const row = studentRes.data as StudentRow | null;
  if (!row) return null;

  const author: FeedAuthor = {
    id: row.id,
    full_name: row.full_name,
    major: row.major,
    study_year: row.study_year,
    avatar_path: row.avatar_path,
  };
  rememberStudent(author);

  const cards = await attachContacts((postsRes.data ?? []) as unknown as Omit<FeedPost, 'contact'>[]);
  const myActive = ((mineRes.data ?? []) as unknown as MyCardRow[]).filter((card) => card.status === 'active');

  return {
    author,
    contact:
      row.contact_method && row.contact ? { method: row.contact_method, value: row.contact.replace(/^@/, '') } : null,
    bio,
    cards,
    needsHelp: unique(cards.map((card) => card.needed)),
    canTeach: unique(cards.map((card) => card.offered)),
    mine: {
      needsHelp: unique(myActive.map((card) => card.needed)),
      canTeach: unique(myActive.map((card) => card.offered)),
    },
  };
}

/** Subjects that are in both lists. */
export function overlap(a: ProfileSubject[], b: ProfileSubject[]): ProfileSubject[] {
  const ids = new Set(b.map((subject) => subject.id));
  return a.filter((subject) => ids.has(subject.id));
}

// ---------------------------------------------------------------------------
// The avatar flies from the card into the profile header (View Transitions API).
// ---------------------------------------------------------------------------
export const STUDENT_AVATAR_TRANSITION = 'student-avatar';
let finishPending: (() => void) | null = null;

/** The profile page calls this once its avatar is on screen. */
export function studentAvatarReady(): void {
  finishPending?.();
  finishPending = null;
}

type StartViewTransition = (update: () => Promise<void>) => { finished: Promise<void> };

/**
 * Opens a student's page. Where the browser supports it (and motion is allowed), the
 * tapped avatar morphs into the big one; elsewhere it is a normal navigation.
 */
export function openStudent(navigate: () => void, avatar: HTMLElement | null): void {
  const start = (document as Document & { startViewTransition?: StartViewTransition }).startViewTransition;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!start || reduced || !avatar) {
    navigate();
    return;
  }
  avatar.style.viewTransitionName = STUDENT_AVATAR_TRANSITION;
  const transition = start.call(
    document,
    () =>
      new Promise<void>((resolve) => {
        finishPending = resolve;
        navigate();
        // Never hold the page frozen if the new avatar does not appear.
        window.setTimeout(resolve, 800);
      }),
  );
  void transition.finished.finally(() => {
    avatar.style.viewTransitionName = '';
  });
}
