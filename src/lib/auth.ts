import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { DegreeLevel, StudyYear } from '@/types/database';
import { messages } from '@/i18n';

/** Any AITU e-mail: students (6-digit id) and teachers (name) @astanait.edu.kz. */
export const STUDENT_EMAIL_RE = /^[a-z0-9._%+-]+@astanait\.edu\.kz$/i;

/**
 * Students have a 6-digit id e-mail, teachers a name e-mail. Exactly 6 digits = student,
 * anything else = teacher (the database checks the same rule).
 */
export function isTeacherEmail(email: string): boolean {
  return !/^\d{6}@astanait\.edu\.kz$/i.test(email.trim());
}

/** Length of the one-time code sent by e-mail (Supabase Auth → Email OTP Length). */
export const CODE_LENGTH = 6;

/** Seconds before "Resend code" can be used again. */
export const RESEND_SECONDS = 60;

/** Turns Supabase Auth errors into short messages for students. */
function friendly(error: { message?: string; status?: number } | null): Error {
  const message = error?.message ?? '';
  const t = messages().authErrors;
  if (/rate limit|only request this after|too many/i.test(message)) {
    return new Error(t.tooMany);
  }
  if (/expired|invalid/i.test(message)) return new Error(t.badCode);
  if (/AITU e-mails|student e-mails|Database error saving new user/i.test(message)) {
    return new Error(t.studentOnly);
  }
  if (/fetch|network/i.test(message)) return new Error(t.offline);
  return new Error(message || t.generic);
}

/** E-mails a one-time code; creates the account on the first sign-in. */
export async function sendCode(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: true },
  });
  if (error) throw friendly(error);
}

/** Checks the code and signs the student in (the session is kept by supabase-js). */
export async function verifyCode(email: string, code: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code, type: 'email' });
  if (error) throw friendly(error);
}

/**
 * Sends the student to the Microsoft sign-in page (AITU accounts only: the Azure app
 * is single-tenant). Microsoft returns them to /login, where supabase-js picks up the session.
 */
export async function signInWithMicrosoft(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'azure',
    options: {
      scopes: 'openid email profile',
      redirectTo: `${window.location.origin}/login`,
    },
  });
  if (error) throw friendly(error);
}

/**
 * Error sent back by Microsoft or Supabase after a failed redirect sign-in (in the query
 * string or the #fragment). Removes it from the address bar so a reload does not show it again.
 */
function readRedirectError(): string | null {
  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const code = params.get('error') ?? hash.get('error');
  if (!code) return null;
  const description = params.get('error_description') ?? hash.get('error_description') ?? '';
  window.history.replaceState(null, '', window.location.pathname);

  if (code === 'access_denied') return messages().authErrors.microsoftCancelled;
  if (/AITU e-mails|student e-mails|Database error saving new user|email/i.test(description)) {
    return messages().authErrors.studentAccountsOnly;
  }
  return friendly({ message: description }).message;
}

let redirectError: string | null | undefined;

/**
 * Reads a failed Microsoft sign-in from the address once, as the app starts on any page
 * (Supabase may send the error to the site root, which then redirects to /login).
 */
export function captureRedirectError(): void {
  if (redirectError === undefined && typeof window !== 'undefined') redirectError = readRedirectError();
}

/** The captured sign-in error, once (the Login page shows it). */
export function takeRedirectError(): string | null {
  captureRedirectError();
  const error = redirectError ?? null;
  redirectError = null;
  return error;
}

/** First and last name from the Microsoft account, to fill in "Complete your profile". */
export async function nameFromAccount(): Promise<{ firstName: string; lastName: string } | null> {
  const { data } = await supabase.auth.getSession();
  const meta = (data.session?.user.user_metadata ?? {}) as Record<string, unknown>;
  const claims = (meta.custom_claims ?? {}) as Record<string, unknown>;
  const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

  const given = text(meta.given_name) || text(claims.given_name);
  const family = text(meta.family_name) || text(claims.family_name);
  if (given || family) return { firstName: given, lastName: family };

  const full = (text(meta.full_name) || text(meta.name)).split(/\s+/).filter(Boolean);
  if (full.length === 0) return null;
  return { firstName: full[0], lastName: full.slice(1).join(' ') };
}

/** Whose welcome tutorial was already offered on this device (see WelcomeTutorial). */
export const TUTORIAL_KEY = 'studyswap-tutorial-for';

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  // The next sign-in on this device sees the welcome tutorial again.
  try {
    localStorage.removeItem(TUTORIAL_KEY);
  } catch {
    // Storage blocked: nothing to forget.
  }
}

/**
 * A teacher's name from a name e-mail: "bakyt.bakayeva@…" → Bakyt Bakayeva. Null when the
 * e-mail does not hold a first and a last name. The database does the same (complete_my_profile).
 */
export function nameFromEmail(email: string): { firstName: string; lastName: string } | null {
  const parts = email.split('@')[0].split(/[._-]+/).filter((part) => /^[a-z]+$/i.test(part));
  if (parts.length < 2) return null;
  const cap = (part: string) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  return { firstName: cap(parts[0]), lastName: parts.slice(1).map(cap).join(' ') };
}

/** E-mail of the signed-in student, or null. */
export async function currentEmail(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.email ?? null;
}

/** Whether the signed-in student already has a profile row (finished "Complete your profile"). */
export async function hasProfile(userId: string): Promise<boolean> {
  const { data, error } = await supabase.from('users').select('id').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data !== null;
}

export interface NewProfile {
  firstName: string;
  lastName: string;
  major: string;
  /** null for a teacher. */
  studyYear: StudyYear | null;
  degree: Extract<DegreeLevel, 'Undergraduate' | "Master's Degree" | 'Teacher'>;
}

/** Creates the profile once; afterwards these details are read-only. */
export async function completeProfile(profile: NewProfile): Promise<void> {
  const { error } = await supabase.rpc('complete_my_profile', {
    p_full_name: `${profile.firstName.trim()} ${profile.lastName.trim()}`,
    p_major: profile.major,
    p_study_year: profile.degree === 'Teacher' ? null : profile.studyYear,
    p_degree: profile.degree,
  });
  if (error) throw new Error(error.message);
}

/**
 * The signed-in student's id (null until known), so pages can tell their own cards apart.
 * Read from the stored session: no network request.
 */
export function useMyId(): string | null {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setId(data.session?.user.id ?? null);
    });
    // Every card asks; the stored session is read locally, so this stays cheap.
    return () => {
      cancelled = true;
    };
  }, []);
  return id;
}
