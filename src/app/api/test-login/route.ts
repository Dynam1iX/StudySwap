import { supabaseAdmin } from '@/lib/server/supabaseAdmin';

/**
 * POST /api/test-login: sign-in for the test accounts listed in the README, so graders can
 * open the app without access to a university mailbox.
 *
 * Only the addresses in NEXT_PUBLIC_TEST_LOGIN_EMAILS are accepted, and only with the fixed
 * code in TEST_LOGIN_CODE (both Vercel env variables). Remove either variable and this route
 * refuses everything. Administrator accounts are never test accounts.
 *
 * Returns a one-time token hash; the browser exchanges it with supabase.auth.verifyOtp.
 */
export async function POST(request: Request): Promise<Response> {
  const allowed = (process.env.NEXT_PUBLIC_TEST_LOGIN_EMAILS ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const fixedCode = process.env.TEST_LOGIN_CODE ?? '';

  const body = (await request.json().catch(() => null)) as { email?: unknown; code?: unknown } | null;
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const code = typeof body?.code === 'string' ? body.code.trim() : '';

  if (!fixedCode || !allowed.includes(email) || code !== fixedCode) {
    return Response.json({ error: 'invalid' }, { status: 401 });
  }

  const db = supabaseAdmin();
  if (!db) return Response.json({ error: 'server' }, { status: 500 });

  // Creates the account on the first sign-in (the AITU e-mail rule in the database still applies).
  let link = await db.auth.admin.generateLink({ type: 'magiclink', email });
  if (link.error && /not found/i.test(link.error.message)) {
    const created = await db.auth.admin.createUser({ email, email_confirm: true });
    if (created.error) return Response.json({ error: 'server' }, { status: 500 });
    link = await db.auth.admin.generateLink({ type: 'magiclink', email });
  }
  const tokenHash = link.data?.properties?.hashed_token;
  if (link.error || !tokenHash) return Response.json({ error: 'server' }, { status: 500 });

  return Response.json({ tokenHash });
}
