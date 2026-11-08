'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Check, Loader2, Lock, RefreshCw, Unlink } from 'lucide-react';
import { BIO_MAX_LENGTH, degreeLabel, saveMyBio, type ProfileUser } from '@/lib/profile';
import { useT } from '@/i18n';

/** Pieces shared by the Edit profile page (phones) and the Edit profile modal (desktop). */

export function SectionTitle({ children }: { children: string }) {
  return <h2 className="font-bricolage text-lg font-extrabold text-ink">{children}</h2>;
}

/** A read-only field: these come from the university's Microsoft account. */
function ReadOnlyField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-b-0">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs font-semibold text-muted">{label}</span>
        <span className="truncate text-[15px] font-bold text-ink">{value || '—'}</span>
      </div>
      <Lock aria-hidden className="size-4 shrink-0 text-placeholder" strokeWidth={2.2} />
    </div>
  );
}

export function TelegramSection({
  handle,
  onLink,
  onUnlink,
}: {
  handle: string | null;
  onLink: () => void;
  onUnlink: () => void;
}) {
  const t = useT();
  if (!handle) {
    return (
      <div className="flex animate-pop flex-col gap-3 rounded-3xl border border-line bg-surface p-4 motion-reduce:animate-none">
        <p className="text-sm font-medium text-muted">
          {t.telegram.linkHint}
        </p>
        <button
          type="button"
          onClick={onLink}
          aria-haspopup="dialog"
          className="shine flex h-12 cursor-pointer items-center justify-center gap-2.5 rounded-2xl bg-linear-to-r from-telegram-from to-telegram-to text-base font-bold text-white shadow-[0_6px_16px_rgba(34,158,217,0.3)] transition active:scale-[0.98]"
        >
          <img src="/telegram.svg" alt="" className="size-6 shrink-0" />
          {t.telegram.link}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-4">
      <div
        key={handle}
        className="flex h-12 animate-pop items-center gap-2.5 rounded-2xl bg-soft px-3.5 text-base font-semibold text-ink motion-reduce:animate-none"
      >
        <img src="/telegram-circle.svg" alt="" className="size-7 shrink-0" />
        <span className="min-w-0 truncate">@{handle}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onLink}
          aria-haspopup="dialog"
          className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-line-strong bg-surface text-sm font-bold text-ink transition hover:bg-soft active:scale-[0.98]"
        >
          <RefreshCw className="size-4" />
          {t.telegram.change}
        </button>
        <button
          type="button"
          onClick={onUnlink}
          aria-haspopup="dialog"
          className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-danger-line bg-surface text-sm font-bold text-danger-ink transition hover:bg-danger-soft active:scale-[0.98]"
        >
          <Unlink className="size-4" />
          {t.telegram.unlink}
        </button>
      </div>
    </div>
  );
}

/** The student's details, read-only: they come from the university account. */
export function StudentDetails({ user }: { user: ProfileUser }) {
  const t = useT();
  return (
    <>
      <div className="flex flex-col rounded-3xl border border-line bg-surface px-4 py-1">
        <ReadOnlyField label={t.edit.firstName} value={user.firstName} />
        <ReadOnlyField label={t.edit.lastName} value={user.lastName} />
        <ReadOnlyField label={t.edit.major} value={user.major} />
        {user.studyYear !== null && <ReadOnlyField label={t.edit.yearOfStudy} value={t.common.year(user.studyYear)} />}
        <ReadOnlyField label={t.edit.degree} value={degreeLabel(t, user.degree)} />
        <ReadOnlyField label={t.edit.email} value={user.email} />
      </div>
      <p className="flex items-start gap-2 text-xs font-medium text-muted">
        <Lock aria-hidden className="mt-px size-3.5 shrink-0" strokeWidth={2.4} />
        {t.edit.readOnlyNote}
      </p>
    </>
  );
}

/** Characters as the database counts them (an emoji is one, not two). */
function chars(text: string): string[] {
  return Array.from(text);
}

/** "About me": up to 200 characters, saved with the button (the database checks the length). */
export function BioSection({
  bio,
  onSaved,
  onError,
}: {
  bio: string;
  onSaved: (bio: string) => void;
  onError: (message: string) => void;
}) {
  const t = useT();
  const [value, setValue] = useState(bio);
  const [saving, setSaving] = useState(false);
  const length = chars(value).length;
  const changed = value.trim() !== bio.trim();
  const near = length >= BIO_MAX_LENGTH - 20;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!changed || saving) return;
    setSaving(true);
    try {
      const saved = await saveMyBio(value);
      setValue(saved);
      onSaved(saved);
    } catch (err: unknown) {
      console.error('set_my_bio:', err);
      onError(t.edit.bioError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-4">
      <textarea
        value={value}
        onChange={(event) => setValue(chars(event.target.value).slice(0, BIO_MAX_LENGTH).join(''))}
        placeholder={t.edit.bioPlaceholder}
        aria-label={t.edit.bio}
        rows={3}
        className="block w-full resize-none rounded-[14px] border border-field bg-surface p-3 text-[16px] leading-relaxed font-semibold text-ink placeholder-placeholder outline-none transition focus:border-brand-from sm:text-[14px]"
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-muted">{t.edit.bioHint}</span>
        <span
          className={`shrink-0 text-[12px] font-semibold transition-colors duration-300 select-none ${
            length >= BIO_MAX_LENGTH ? 'text-danger' : near ? 'text-amber-600' : 'text-muted'
          }`}
        >
          {length} / {BIO_MAX_LENGTH}
        </span>
      </div>
      {changed && (
        <button
          type="submit"
          disabled={saving}
          className="flex h-12 animate-pop cursor-pointer items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-brand-fill-from to-brand-fill-to text-base font-bold text-white transition active:scale-[0.98] disabled:opacity-70 motion-reduce:animate-none"
        >
          {saving ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" strokeWidth={2.6} />}
          {saving ? t.edit.bioSaving : t.edit.bioSave}
        </button>
      )}
    </form>
  );
}
