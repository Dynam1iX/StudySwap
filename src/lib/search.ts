import { supabase } from '@/lib/supabase';
import { nameKey, nameKeys } from '@/lib/nameSearch';
import type { FeedPost } from '@/lib/feed';
import type { Category, StudyYear } from '@/types/database';

/** One row of the student's recent searches (newest first). */
export interface RecentSearch {
  id: string;
  query: string;
}

/** Filters the Search page applies to the active barter cards. All are optional. */
export interface SearchFilters {
  /** Submitted text (Enter); null until the student searches. */
  query: string | null;
  category: Category | null;
  /** Study year of the card's author. */
  year: StudyYear | null;
  /** Educational program of the card's author (users.major). */
  program: string | null;
}

export const EMPTY_FILTERS: SearchFilters = { query: null, category: null, year: null, program: null };

export const STUDY_YEARS: StudyYear[] = [1, 2, 3];

/** The order of the "Browse categories" grid. */
export const SEARCH_CATEGORIES: Category[] = ['CS & Dev', 'Languages', 'Humanities', 'Mathematics'];

export interface ProgramOption {
  label: string;
  /** Other spellings stored in users.major. */
  aliases?: string[];
}

/** AITU educational programs, grouped by school as on the university site. */
export const PROGRAM_GROUPS: ProgramOption[][] = [
  [
    { label: 'Software Engineering' },
    { label: 'Computer Science' },
    { label: 'Big Data Analysis' },
    { label: 'Media Technologies' },
    { label: 'Mathematical and Computational Science' },
  ],
  [{ label: 'Cybersecurity' }, { label: 'Smart Security Technologies' }],
  [{ label: 'Smart Technologies' }],
  [{ label: 'Industrial Internet of Things', aliases: ['Industrial IoT'] }, { label: 'Electronic Engineering' }],
  [{ label: 'Digital Journalism' }],
  [
    { label: 'IT Entrepreneurship' },
    { label: 'IT Management' },
    { label: 'AI Business' },
    { label: 'Digital Public Administration' },
  ],
  [{ label: 'Digital Technologies in Nuclear Power Engineering' }],
];

const PROGRAMS = PROGRAM_GROUPS.flat();

export function isProgram(value: string | null): value is string {
  return value !== null && PROGRAMS.some((program) => program.label === value);
}

function normalize(text: string | null | undefined): string {
  return (text ?? '').toLocaleLowerCase('en').replace(/\s+/g, ' ').trim();
}

function majorMatches(major: string | null | undefined, programLabel: string): boolean {
  const program = PROGRAMS.find((p) => p.label === programLabel);
  if (!program) return false;
  const value = normalize(major);
  return [program.label, ...(program.aliases ?? [])].some((name) => normalize(name) === value);
}

/**
 * Every word of the query must appear in the card's subjects, codes or topics, or in the
 * author's name (spelling forgiven, Cyrillic too: see nameSearch).
 */
function queryMatches(post: FeedPost, query: string): boolean {
  const words = normalize(query).split(' ').filter(Boolean);
  if (words.length === 0) return true;
  const author = nameKey(post.author?.full_name ?? '');
  const haystack = normalize(
    [
      post.needed?.name,
      post.needed?.code,
      post.needed?.department,
      post.offered?.name,
      post.offered?.code,
      post.offered?.department,
      post.description,
      post.offered_description,
    ].join(' '),
  );
  return words.every((word) => {
    if (haystack.includes(word)) return true;
    const key = nameKey(word);
    return key.length >= 2 && author.includes(key);
  });
}

/** A student found by name (search_students): what their profile shows anyway. */
export interface FoundStudent {
  id: string;
  full_name: string;
  major: string | null;
  study_year: number | null;
  degree_level: string | null;
  avatar_path: string | null;
  active_cards: number;
}

/** Students whose first or last name matches every word of the query (up to 20). */
export async function searchStudents(query: string): Promise<FoundStudent[]> {
  const keys = nameKeys(query);
  if (keys.length === 0) return [];
  const { data, error } = await supabase.rpc('search_students', { p_keys: keys });
  if (error) throw error;
  return (data ?? []) as FoundStudent[];
}

export function hasActiveFilters(filters: SearchFilters): boolean {
  return Boolean(filters.query || filters.category || filters.year || filters.program);
}

/** Cards matching every active filter, in Feed order (newest first). */
export function filterPosts(posts: FeedPost[], filters: SearchFilters): FeedPost[] {
  return posts.filter(
    (post) =>
      (!filters.query || queryMatches(post, filters.query)) &&
      (!filters.category ||
        post.needed?.category === filters.category ||
        post.offered?.category === filters.category) &&
      (!filters.year || post.author?.study_year === filters.year) &&
      (!filters.program || majorMatches(post.author?.major, filters.program)),
  );
}

/** Active cards per category: a card counts once for each category it touches. */
export function countByCategory(posts: FeedPost[]): Record<Category, number> {
  const counts: Record<Category, number> = { 'CS & Dev': 0, Languages: 0, Humanities: 0, Mathematics: 0 };
  for (const post of posts) {
    const categories = new Set([post.needed?.category, post.offered?.category]);
    for (const category of categories) {
      if (category) counts[category] += 1;
    }
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Recent searches (table search_history, reached only through these functions)
// ---------------------------------------------------------------------------

export async function fetchRecentSearches(): Promise<RecentSearch[]> {
  const { data, error } = await supabase.rpc('get_recent_searches', { p_limit: 10 });
  if (error) throw error;
  return ((data ?? []) as { id: string; query: string }[]).map(({ id, query }) => ({ id, query }));
}

export async function addRecentSearch(query: string): Promise<void> {
  const { error } = await supabase.rpc('add_recent_search', { p_query: query });
  if (error) throw error;
}

export async function deleteRecentSearch(id: string): Promise<void> {
  const { error } = await supabase.rpc('delete_recent_search', { p_id: id });
  if (error) throw error;
}

export async function clearRecentSearches(): Promise<void> {
  const { error } = await supabase.rpc('clear_recent_searches');
  if (error) throw error;
}
