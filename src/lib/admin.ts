import type { CardFile } from '@/lib/cardFiles';
import { supabase } from '@/lib/supabase';
import type { Category, PostStatus } from '@/types/database';

/** A card as the administrator sees it (any status, with the author's e-mail). */
export interface AdminCard {
  id: string;
  created_at: string;
  status: PostStatus;
  needed_name: string;
  needed_category: Category;
  offered_name: string;
  offered_category: Category;
  description: string;
  offered_description: string;
  author_id: string;
  author_name: string;
  author_email: string;
  file_count: number;
  /** Photos / PDFs on the card, oldest first (missing before 20261102120000_ai_moderation runs). */
  files?: CardFile[];
}

/** admin_stats(): totals and the three End-term analysis results (see migration 20261101120000_admin). */
export interface AdminStats {
  totals: { cards: number; active: number; completed: number; students: number; deleted: number };
  /** Q1: most needed subjects and how many cards offer them. */
  demand: { subject: string; category: Category; needed: number; offered: number }[];
  /** Q2: new cards per day (Astana time), last 14 days. */
  per_day: { day: string; cards: number }[];
  /** Q3: cards and completed swaps per category of the needed subject. */
  categories: { category: Category; cards: number; completed: number; rate: number }[];
}

/** Reasons offered when deleting a card; stored in moderation_log. */
export const DELETE_REASONS = ['paid', 'spam', 'offtopic', 'offensive'] as const;
export type DeleteReason = (typeof DELETE_REASONS)[number];

/** true when the signed-in user is an administrator or moderator (decided by the database). */
export async function amIAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('am_i_admin');
  // Before the migration runs the function does not exist: simply no admin entry.
  if (error) return false;
  return data === true;
}

export async function fetchAdminCards(): Promise<AdminCard[]> {
  const { data, error } = await supabase.rpc('admin_list_cards');
  if (error) throw error;
  return (data ?? []) as AdminCard[];
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const { data, error } = await supabase.rpc('admin_stats');
  if (error) throw error;
  return data as AdminStats;
}

/** Publishes a card the AI could not check (status 'pending' → 'active'). */
export async function approveCardAsAdmin(id: string): Promise<void> {
  const { error } = await supabase.rpc('admin_approve_card', { p_id: id });
  if (error) throw error;
}

export async function deleteCardAsAdmin(id: string, reason: DeleteReason): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_card', { p_id: id, p_reason: reason });
  if (error) throw error;
}
