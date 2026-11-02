import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase with the service role key: bypasses Row Level Security, so it lives only on
 * the server (Vercel env SUPABASE_SERVICE_ROLE_KEY, never NEXT_PUBLIC_). Used by
 * /api/cards to write a card after the AI check.
 */
let client: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  client ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

/** The signed-in student behind "Authorization: Bearer <access token>", or null. */
export async function userFromRequest(db: SupabaseClient, request: Request): Promise<string | null> {
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}
