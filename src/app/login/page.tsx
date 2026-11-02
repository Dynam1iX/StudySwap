'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react';
import { CodeInput } from '@/components/auth/CodeInput';
import { HeroCard } from '@/components/auth/HeroCard';
import { MicrosoftLogo } from '@/components/auth/MicrosoftLogo';
import { playSound } from '@/lib/sound';
import { QuickSettings } from '@/components/settings/QuickSettings';
import { AppHeader } from '@/components/layout/AppHeader';
import { MobileShell } from '@/components/layout/MobileShell';
import {
  RESEND_SECONDS,
  STUDENT_EMAIL_RE,
  sendCode,
  signInWithMicrosoft,
  takeRedirectError,
  verifyCode,
} from '@/lib/auth';
import { useReplay } from '@/lib/useReplay';
import { useT } from '@/i18n';

/** Error from a failed Microsoft sign-in (captured by the AuthGate before any redirect). */
let redirectError: string | null | undefined;
function initialRedirectError(): string | null {
  // The page renders only in the browser (behind the AuthGate splash).
  if (typeof window === 'undefined') return null;
  if (redirectError === undefined) redirectError = takeRedirectError();
  return redirectError;
}

/** The headline, word by word. */
function Headline({ onBrand = false }: { onBrand?: boolean }) {
  const t = useT();
  return (
    <h1
      className={`font-bricolage font-bold ${
        onBrand
          ? 'max-w-[600px] text-[56px] leading-[1.04] text-white xl:text-[64px]'
          : 'text-[36px] leading-[1.1] text-ink'
      }`}
    >
      {t.login.headline.split(' ').map((word, index) => (
        <span
          key={index}
          style={{ animationDelay: `${index * 70}ms` }}
          className="inline-block animate-rise motion-reduce:animate-none"
        >
          {word}&nbsp;
        </span>
      ))}
    </h1>
  );
}

/** Desktop: the gradient half of the page with the headline and the floating example card. */
function BrandPanel() {
  const t = useT();
  return (
    <div className="relative hidden overflow-hidden rounded-[32px] bg-linear-135 from-brand-from to-brand-to p-14 lg:flex lg:flex-col">
      <span
        aria-hidden
        className="absolute -top-36 -left-28 size-[420px] animate-float rounded-full bg-white/15 motion-reduce:animate-none"
      />
      <span
        aria-hidden
        style={{ animationDelay: '1.2s' }}
        className="absolute -right-24 -bottom-40 size-[520px] animate-float rounded-full bg-white/10 motion-reduce:animate-none"
      />
      <span aria-hidden className="absolute top-16 right-24 size-40 rounded-full bg-white/10" />

      <div className="relative flex items-center gap-2.5">
        <img src="/StudySwapLogo.svg" alt="" className="size-10 rounded-xl ring-2 ring-white/40" />
        <span className="font-bricolage text-[26px] font-bold text-white">StudySwap</span>
      </div>
      <div className="relative mt-12 flex flex-col gap-5">
        <Headline onBrand />
        <p
          style={{ animationDelay: '500ms' }}
          className="max-w-[480px] animate-rise text-[19px] leading-snug font-bold text-white motion-reduce:animate-none"
        >
          {t.login.subtitle}
        </p>
      </div>
      <div
        style={{ animationDelay: '600ms' }}
        className="relative mt-auto flex animate-rise justify-center pt-10 pb-12 motion-reduce:animate-none"
      >
        <div className="scale-[1.35]">
          <HeroCard />
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const t = useT();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Changes on every failed attempt, to replay the shake. */
  const [shake, setShake] = useState(0);
  const [resendIn, setResendIn] = useState(0);
  const [bubbling, bubble] = useReplay(700);
  /** Leaving for the Microsoft sign-in page. */
  const [msBusy, setMsBusy] = useState(false);
  const [msError, setMsError] = useState<string | null>(initialRedirectError);

  useEffect(() => {
    redirectError = undefined;
    // Back button from the Microsoft page: the browser restores this page as it was.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setMsBusy(false);
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  const continueWithMicrosoft = async () => {
    if (msBusy) return;
    setMsBusy(true);
    setMsError(null);
    try {
      await signInWithMicrosoft();
      // The browser is now leaving for Microsoft; the button keeps animating until then.
    } catch (err: unknown) {
      setMsError(err instanceof Error ? err.message : t.login.microsoftError);
      setMsBusy(false);
    }
  };

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const fail = (message: string) => {
    playSound('error');
    setError(message);
    setShake((n) => n + 1);
  };

  const requestCode = async () => {
    setBusy(true);
    setError(null);
    try {
      await sendCode(email);
      setCode('');
      setStep('code');
      setResendIn(RESEND_SECONDS);
    } catch (err: unknown) {
      fail(err instanceof Error ? err.message : t.login.sendError);
    } finally {
      setBusy(false);
    }
  };

  const submitEmail = (event: FormEvent) => {
    event.preventDefault();
    if (!STUDENT_EMAIL_RE.test(email.trim())) {
      fail(t.login.emailInvalid);
      return;
    }
    bubble();
    void requestCode();
  };

  const submitCode = async (value: string) => {
    setBusy(true);
    setError(null);
    try {
      await verifyCode(email, value);
      // Signed in: the AuthGate takes the student to the app or to "Complete your profile".
    } catch (err: unknown) {
      setCode('');
      fail(err instanceof Error ? err.message : t.login.checkError);
      setBusy(false);
    }
  };

  return (
    <MobileShell full>
      {/* Desktop: brand panel on the left, the form centred on the right. */}
      <div className="lg:grid lg:min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(440px,40%)] lg:gap-6 lg:p-6">
        <BrandPanel />
        <div className="lg:relative lg:flex lg:flex-col lg:justify-center">
          {/* Language, theme and sound: in the logo row on phones, top right on desktop. */}
          <div className="lg:hidden">
            <AppHeader actions={<QuickSettings />} />
          </div>
          <div className="absolute top-2 right-2 hidden lg:block">
            <QuickSettings />
          </div>

          {/* 16px sides, 8px top and bottom, 16px between blocks. */}
          <div className="flex flex-col gap-4 px-4 py-2 lg:mx-auto lg:w-full lg:max-w-[400px]">
            {step === 'email' ? (
              <>
                {/* Phones: headline and example card above the form (desktop has them in the brand panel). */}
                <div className="flex flex-col gap-4 lg:hidden">
                  <Headline />
                  <p
                    style={{ animationDelay: '500ms' }}
                    className="animate-rise text-base font-semibold text-muted motion-reduce:animate-none"
                  >
                    {t.login.subtitle}
                  </p>

                  <div style={{ animationDelay: '600ms' }} className="animate-rise motion-reduce:animate-none">
                    <HeroCard />
                  </div>
                </div>
                <div className="hidden animate-rise flex-col gap-1.5 motion-reduce:animate-none lg:flex">
                  <h2 className="font-bricolage text-[32px] leading-tight font-bold text-ink">{t.login.formTitle}</h2>
                  <p className="text-[15px] font-semibold text-muted">{t.login.formSubtitle}</p>
                </div>

                <form
                  onSubmit={submitEmail}
                  noValidate
                  style={{ animationDelay: '700ms' }}
                  className="flex animate-rise flex-col gap-4 motion-reduce:animate-none"
                >
                  <label
                    key={shake}
                    className={`flex flex-col gap-2 ${error ? 'animate-shake motion-reduce:animate-none' : ''}`}
                  >
                    <span className="text-sm font-semibold text-ink">{t.login.emailLabel}</span>
                    <input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      spellCheck={false}
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        setError(null);
                      }}
                      placeholder="barcode@astanait.edu.kz"
                      aria-invalid={error ? true : undefined}
                      className={`h-12 rounded-xl border bg-surface px-4 text-base font-medium text-ink outline-none transition-[border-color,box-shadow] placeholder:text-placeholder ${
                        error
                          ? 'border-danger ring-2 ring-red-100'
                          : 'border-field focus:border-brand-from focus:shadow-[0_0_0_3px_rgba(173,70,255,0.15)]'
                      }`}
                    />
                    <span className={`text-xs font-semibold ${error ? 'text-danger' : 'text-muted'}`}>
                      {error ?? t.login.emailHint}
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={busy}
                    className={`bubbly flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-linear-to-r from-brand-fill-from to-brand-fill-to text-lg font-semibold text-white shadow-[0_8px_20px_rgba(200,40,140,0.25)] transition active:scale-[0.97] disabled:cursor-default disabled:opacity-70 ${
                      bubbling ? 'bubbly-animate' : ''
                    }`}
                  >
                    {busy && <Loader2 className="size-5 animate-spin" />}
                    {t.login.continue}
                  </button>
                </form>

                <div
                  style={{ animationDelay: '800ms' }}
                  className="flex animate-rise flex-col gap-4 motion-reduce:animate-none"
                >
                  <div className="h-px bg-line-strong" />
                  <button
                    type="button"
                    onClick={() => void continueWithMicrosoft()}
                    disabled={msBusy}
                    aria-busy={msBusy}
                    className={`flex h-12 cursor-pointer items-center justify-center gap-2.5 rounded-xl border bg-surface text-base font-semibold text-ink transition-[background-color,border-color,transform] hover:bg-soft active:scale-[0.98] disabled:cursor-default ${
                      msBusy ? 'scale-[0.98] border-brand-from' : 'border-line-strong'
                    }`}
                  >
                    <MicrosoftLogo loading={msBusy} />
                    {msBusy ? t.login.openingMicrosoft : t.login.microsoft}
                  </button>
                  {msError && (
                    <p
                      key={msError}
                      role="alert"
                      className="animate-shake rounded-xl border border-danger-line bg-danger-soft p-3 text-sm font-semibold text-danger-ink motion-reduce:animate-none"
                    >
                      {msError}
                    </p>
                  )}
                  <p className="text-center text-xs leading-[18px] font-medium text-muted">
                    {t.login.legalBefore}
                    <Link href="/terms" className="font-semibold text-brand-ink underline underline-offset-2">
                      {t.login.legalTerms}
                    </Link>
                    {t.login.legalAnd}
                    <Link href="/privacy" className="font-semibold text-brand-ink underline underline-offset-2">
                      {t.login.legalPrivacy}
                    </Link>
                    {t.login.legalAfter}
                  </p>
                </div>
              </>
            ) : (
              <div className="flex animate-rise flex-col gap-5 motion-reduce:animate-none">
                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setError(null);
                  }}
                  className="-ml-1 flex w-fit cursor-pointer items-center gap-1.5 rounded-lg px-1 py-1 text-sm font-semibold text-muted transition hover:text-ink"
                >
                  <ArrowLeft className="size-4" />
                  {t.login.changeEmail}
                </button>

                <span className="flex size-16 animate-pop items-center justify-center rounded-2xl bg-linear-to-br from-brand-from to-brand-to text-white shadow-[0_8px_20px_rgba(173,70,255,0.3)] motion-reduce:animate-none">
                  <MailCheck className="size-8" strokeWidth={2} />
                </span>

                <div className="flex flex-col gap-2">
                  <h1 className="font-bricolage text-3xl font-bold text-ink">{t.login.checkEmail}</h1>
                  <p className="text-base font-semibold text-muted">
                    {t.login.sentBefore}
                    <span className="text-ink">{email.trim().toLowerCase()}</span>
                    {t.login.sentAfter}
                  </p>
                </div>

                <CodeInput
                  key={shake}
                  value={code}
                  onChange={(value) => {
                    setCode(value);
                    setError(null);
                  }}
                  onComplete={submitCode}
                  disabled={busy}
                  error={Boolean(error)}
                />

                <p className={`min-h-5 text-sm font-semibold ${error ? 'text-danger' : 'text-muted'}`}>
                  {busy ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin text-brand-from" />
                      {t.login.checking}
                    </span>
                  ) : (
                    (error ?? t.login.codeValid)
                  )}
                </p>

                <button
                  type="button"
                  onClick={() => void requestCode()}
                  disabled={busy || resendIn > 0}
                  className="h-12 cursor-pointer rounded-xl border border-line-strong bg-surface text-sm font-bold text-ink transition hover:bg-soft active:scale-[0.98] disabled:cursor-default disabled:text-muted disabled:hover:bg-surface"
                >
                  {resendIn > 0 ? t.login.resendIn(resendIn) : t.login.resend}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </MobileShell>
  );
}
