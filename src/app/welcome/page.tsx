'use client';

import { takeReturnPath } from '@/components/auth/AuthGate';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { ChevronDown, Loader2, Lock } from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { MobileShell } from '@/components/layout/MobileShell';
import {
  completeProfile,
  currentEmail,
  isTeacherEmail,
  nameFromAccount,
  nameFromEmail,
  signOut,
  type NewProfile,
} from '@/lib/auth';
import { PROGRAM_GROUPS, STUDY_YEARS } from '@/lib/search';
import { playSound } from '@/lib/sound';
import type { StudyYear } from '@/types/database';
import { useT } from '@/i18n';


/** Students choose; a teacher (name e-mail) is fixed. */
const DEGREES: NewProfile['degree'][] = ['Undergraduate', "Master's Degree"];

const FIELD =
  'h-12 w-full rounded-xl border border-field bg-surface px-4 text-[16px] font-semibold text-ink outline-none transition-[border-color,box-shadow] placeholder:text-placeholder focus:border-brand-from focus:shadow-[0_0_0_3px_rgba(173,70,255,0.15)] sm:text-[15px]';

/** A name taken from the account: shown, not editable. */
const FIELD_FIXED =
  'h-12 w-full cursor-default rounded-xl border border-transparent bg-soft px-4 text-[16px] font-bold text-ink outline-none sm:text-[15px]';

function Field({ label, children, delay }: { label: string; children: ReactNode; delay: number }) {
  return (
    <label style={{ animationDelay: `${delay}ms` }} className="flex animate-rise flex-col gap-2 motion-reduce:animate-none">
      <span className="text-sm font-semibold text-ink">{label}</span>
      {children}
    </label>
  );
}

/** Segmented choice with a gradient pill on the selected option. */
function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-2xl bg-soft p-1">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`relative h-11 flex-1 cursor-pointer overflow-hidden rounded-xl text-sm font-bold transition-[color,transform] duration-300 active:scale-95 ${
              selected ? 'text-white' : 'text-ink hover:bg-line/60'
            }`}
          >
            <span
              aria-hidden
              className={`absolute inset-0 bg-linear-to-r from-brand-fill-from to-brand-fill-to transition-opacity duration-300 ${
                selected ? 'opacity-100' : 'opacity-0'
              }`}
            />
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** First sign-in: the student fills in their details once; afterwards they are read-only. */
/** First and last name together (with the space) fit the database limit of 100 characters. */
const NAME_MAX = 49;

export default function WelcomePage() {
  const t = useT();
  const [email, setEmail] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [major, setMajor] = useState('');
  const [studyYear, setStudyYear] = useState<StudyYear | null>(null);
  const [degree, setDegree] = useState<NewProfile['degree'] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  /**
   * Where a fixed name came from: the Microsoft account, or a teacher's name e-mail
   * (bakyt.bakayeva@… → Bakyt Bakayeva). Then the name cannot be edited; the database
   * takes it from the same place whatever is sent (complete_my_profile).
   */
  const [nameSource, setNameSource] = useState<'microsoft' | 'email' | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([currentEmail(), nameFromAccount()]).then(([address, account]) => {
      if (cancelled) return;
      setEmail(address);
      const fromEmail = address && isTeacherEmail(address) ? nameFromEmail(address) : null;
      const fixed = account?.firstName && account.lastName ? account : fromEmail;
      if (!fixed) {
        // Only a first name on the account: a hint, still editable.
        if (account?.firstName) setFirstName((current) => current || account.firstName.slice(0, NAME_MAX));
        return;
      }
      setFirstName(fixed.firstName.slice(0, NAME_MAX));
      setLastName(fixed.lastName.slice(0, NAME_MAX));
      setNameSource(fixed === account ? 'microsoft' : 'email');
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const nameFixed = nameSource !== null;

  // Decided by the e-mail: 6 digits = student, a name = teacher (no year, no choice).
  const role = email === null ? null : isTeacherEmail(email) ? 'teacher' : 'student';

  const missing =
    firstName.trim().length < 1
      ? t.welcome.missingFirst
      : lastName.trim().length < 1
        ? t.welcome.missingLast
        : !major
          ? t.welcome.missingMajor
          : role !== 'student'
            ? null
            : !studyYear
              ? t.welcome.missingYear
              : !degree
                ? t.welcome.missingDegree
                : null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (missing || !role) {
      setError(missing);
      setShake((n) => n + 1);
      playSound('error');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await completeProfile(
        role === 'teacher'
          ? { firstName, lastName, major, studyYear: null, degree: 'Teacher' }
          : { firstName, lastName, major, studyYear, degree: degree ?? 'Undergraduate' },
      );
      // A full load so every page starts with the new profile.
      window.location.assign(takeReturnPath());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.welcome.saveError);
      setShake((n) => n + 1);
      playSound('error');
      setBusy(false);
    }
  };

  return (
    <MobileShell panel="narrow">
      <AppHeader />

      <form onSubmit={submit} noValidate className="flex flex-col gap-4 px-4 py-2">
        <div className="flex animate-rise flex-col gap-1 motion-reduce:animate-none">
          <h1 className="font-bricolage text-3xl font-bold text-ink">{t.welcome.title}</h1>
          <p className="text-sm font-semibold text-muted">
            {t.welcome.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t.edit.firstName} delay={60}>
            <input
              value={firstName}
              onChange={(event) => setFirstName(event.target.value.slice(0, NAME_MAX))}
              readOnly={nameFixed}
              aria-readonly={nameFixed || undefined}
              autoComplete="given-name"
              placeholder={t.welcome.firstPlaceholder}
              className={nameFixed ? FIELD_FIXED : FIELD}
            />
          </Field>
          <Field label={t.edit.lastName} delay={100}>
            <input
              value={lastName}
              onChange={(event) => setLastName(event.target.value.slice(0, NAME_MAX))}
              readOnly={nameFixed}
              aria-readonly={nameFixed || undefined}
              autoComplete="family-name"
              placeholder={t.welcome.lastPlaceholder}
              className={nameFixed ? FIELD_FIXED : FIELD}
            />
          </Field>
        </div>
        {nameSource && (
          <p className="-mt-2 flex animate-rise items-center gap-1.5 text-xs font-medium text-muted motion-reduce:animate-none">
            <Lock aria-hidden className="size-3.5 shrink-0" strokeWidth={2.4} />
            {nameSource === 'microsoft' ? t.welcome.nameFromMicrosoft : t.welcome.nameFromEmail}
          </p>
        )}

        <Field label={t.edit.major} delay={140}>
          <span className="relative">
            <select
              value={major}
              onChange={(event) => setMajor(event.target.value)}
              className={`${FIELD} cursor-pointer appearance-none pr-10 ${major ? '' : 'text-placeholder'}`}
            >
              <option value="" disabled>
                {t.welcome.majorPlaceholder}
              </option>
              {PROGRAM_GROUPS.flat().map((program) => (
                <option key={program.label} value={program.label}>
                  {program.label}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-muted" />
          </span>
        </Field>

        {role === 'student' && (
          <Field label={t.edit.yearOfStudy} delay={180}>
            <Segmented
              label={t.edit.yearOfStudy}
              options={STUDY_YEARS.map((year) => ({ value: year, label: t.common.year(year) }))}
              value={studyYear}
              onChange={setStudyYear}
            />
          </Field>
        )}

        {role === 'student' && (
          <Field label={t.edit.degree} delay={220}>
            <Segmented label={t.edit.degree} options={DEGREES.map((value) => ({ value, label: t.degree[value] }))} value={degree} onChange={setDegree} />
          </Field>
        )}

        {/* A name e-mail is a teacher: fixed, nothing to choose. */}
        {role === 'teacher' && (
          <div style={{ animationDelay: '180ms' }} className="flex animate-rise flex-col gap-2 motion-reduce:animate-none">
            <span className="text-sm font-semibold text-ink">{t.edit.degree}</span>
            <div className="flex h-12 items-center justify-between gap-3 rounded-2xl bg-soft pr-4 pl-1">
              <span className="flex h-10 items-center rounded-xl bg-linear-to-r from-brand-fill-from to-brand-fill-to px-4 text-sm font-bold text-white">
                {t.degree.Teacher}
              </span>
              <Lock aria-hidden className="size-4 shrink-0 text-placeholder" />
            </div>
            <span className="text-xs font-medium text-muted">{t.welcome.teacherByEmail}</span>
          </div>
        )}

        <div
          style={{ animationDelay: '260ms' }}
          className="flex animate-rise items-center justify-between gap-3 rounded-2xl bg-soft px-4 py-3 motion-reduce:animate-none"
        >
          <div className="flex min-w-0 flex-col">
            <span className="text-xs font-semibold text-muted">{t.edit.email}</span>
            <span className="truncate text-[15px] font-bold text-ink">{email ?? '…'}</span>
          </div>
          <Lock aria-hidden className="size-4 shrink-0 text-placeholder" />
        </div>

        <p className="flex items-start gap-2 text-xs font-medium text-muted">
          <Lock aria-hidden className="mt-px size-3.5 shrink-0" strokeWidth={2.4} />
          {t.welcome.checkCarefully}
        </p>

        {error && (
          <p key={shake} className="animate-shake rounded-xl border border-danger-line bg-danger-soft p-3 text-xs font-semibold text-danger-ink">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="shine flex h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-brand-fill-from to-brand-fill-to text-[17px] font-bold text-white shadow-[0_8px_20px_rgba(200,40,140,0.28)] transition active:scale-[0.98] disabled:opacity-70"
        >
          {busy && <Loader2 className="size-5 animate-spin" />}
          {t.welcome.start}
        </button>

        <button
          type="button"
          onClick={() => void signOut().then(() => window.location.assign('/login'))}
          className="h-11 cursor-pointer text-sm font-semibold text-muted transition hover:text-ink"
        >
          {t.welcome.otherEmail}
        </button>
      </form>
    </MobileShell>
  );
}
