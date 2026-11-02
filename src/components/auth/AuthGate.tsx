'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { captureRedirectError, hasProfile } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useT } from '@/i18n';

/** Pages for students who are not signed in. */
const LOGIN_PATH = '/login';
/** "Complete your profile", for students signed in without a profile yet. */
const WELCOME_PATH = '/welcome';
/** Open to everyone, signed in or not: the login page links to them. */
const PUBLIC_PATHS = new Set(['/terms', '/privacy']);

/** A card or profile link opened while signed out: shown again right after signing in. */
const RETURN_KEY = 'studyswap-return-to';
const RETURNABLE = /^\/(c|u)\//;

function rememberReturn(path: string) {
  try {
    if (RETURNABLE.test(path)) sessionStorage.setItem(RETURN_KEY, path);
  } catch {
    // Storage blocked: the student simply lands on the Feed.
  }
}

/** Where to go after signing in (and completing the profile): the saved link, or the Feed. */
export function takeReturnPath(): string {
  try {
    const path = sessionStorage.getItem(RETURN_KEY);
    sessionStorage.removeItem(RETURN_KEY);
    if (path && RETURNABLE.test(path)) return path;
  } catch {
    // ignore
  }
  return '/';
}

type Status = 'checking' | 'signed-out' | 'needs-profile' | 'ready' | 'error';

/** Where a student with this status may be; null means "anywhere else". */
function targetFor(status: Status, path: string): string | null {
  if (PUBLIC_PATHS.has(path)) return null;
  if (status === 'signed-out') return path === LOGIN_PATH ? null : LOGIN_PATH;
  if (status === 'needs-profile') return path === WELCOME_PATH ? null : WELCOME_PATH;
  if (status === 'ready') return path === LOGIN_PATH || path === WELCOME_PATH ? '/' : null;
  return null;
}

function CheckFailed() {
  const t = useT();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-page px-6 text-center">
      <img src="/StudySwapLogo.svg" alt="StudySwap" className="size-14 rounded-2xl" />
      <p className="font-bricolage text-xl font-extrabold text-ink">{t.authGate.title}</p>
      <p className="text-sm font-medium text-muted">{t.authGate.body}</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="h-12 cursor-pointer rounded-xl bg-linear-to-r from-brand-fill-from to-brand-fill-to px-6 text-sm font-bold text-white active:scale-95"
      >
        {t.common.tryAgain}
      </button>
    </div>
  );
}

export function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-page">
      <img src="/StudySwapLogo.svg" alt="StudySwap" className="size-14 animate-breathe rounded-2xl motion-reduce:animate-none" />
    </div>
  );
}

/**
 * Sends students to the right place: /login when signed out, /welcome until the
 * profile is complete, the app otherwise. Shows a splash instead of a page that is
 * about to redirect, so nothing flashes.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [status, setStatus] = useState<Status>('checking');
  /** Latest status and address, read inside the auth listener. */
  const statusRef = useRef<Status>('checking');
  const pathRef = useRef(pathname);
  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);
  /** The student whose profile was last checked: SIGNED_IN repeats on every tab return. */
  const checkedId = useRef<string | null>(null);

  useEffect(() => {
    // Before any redirect drops the address's ?error= / #error=.
    captureRedirectError();
    let cancelled = false;
    const set = (next: Status) => {
      if (cancelled) return;
      statusRef.current = next;
      setStatus(next);
    };

    const evaluate = async (userId: string | null) => {
      if (!userId) {
        const wasIn = statusRef.current === 'ready' || statusRef.current === 'needs-profile';
        checkedId.current = null;
        if (wasIn) {
          // Signed out in another tab or the session expired: a full load clears every
          // page Next keeps alive (and the previous student's data in them).
          rememberReturn(pathRef.current);
          window.location.assign(LOGIN_PATH);
          return;
        }
        set('signed-out');
        return;
      }
      // Same student as before (Supabase repeats SIGNED_IN when the tab comes back):
      // nothing to check again.
      if (userId === checkedId.current && (statusRef.current === 'ready' || statusRef.current === 'needs-profile')) {
        return;
      }
      try {
        const complete = await hasProfile(userId);
        checkedId.current = userId;
        set(complete ? 'ready' : 'needs-profile');
      } catch (err: unknown) {
        console.error('Could not check the profile:', err);
        // Never let a student in without knowing whether their profile exists, but never
        // throw out a student who is already in because of one failed request.
        if (statusRef.current !== 'ready') set('error');
      }
    };

    supabase.auth.getSession().then(({ data }) => evaluate(data.session?.user.id ?? null));
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') void evaluate(session?.user.id ?? null);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const target = targetFor(status, pathname);

  useEffect(() => {
    if (!target) return;
    if (target === LOGIN_PATH || target === WELCOME_PATH) rememberReturn(pathname);
    router.replace(target === '/' ? takeReturnPath() : target);
  }, [target, router, pathname]);

  if (status === 'error') return <CheckFailed />;
  if (status === 'checking' || target) return <Splash />;
  return <>{children}</>;
}
