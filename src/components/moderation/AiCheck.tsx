'use client';

import type { CSSProperties } from 'react';
import {
  ArrowRight,
  Banknote,
  CircleOff,
  Clock,
  CloudOff,
  FileWarning,
  GraduationCap,
  Hourglass,
  Loader2,
  MessageSquareWarning,
  PenLine,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import type { Violation, ViolationField } from '@/lib/moderation';
import type { Rejection } from '@/lib/publish';
import { useT } from '@/i18n';

/** Where a card is in Publish / Save: uploading its files, then the AI check. */
export type CheckPhase = 'idle' | 'uploading' | 'checking';

/** Button text while working: a spinner for the upload, sparkles for the AI check. */
export function CheckingLabel({ phase }: { phase: Exclude<CheckPhase, 'idle'> }) {
  const t = useT();
  return phase === 'uploading' ? (
    <span className="flex items-center gap-2">
      <Loader2 aria-hidden className="size-5 animate-spin" />
      {t.moderation.uploading}
    </span>
  ) : (
    <span className="flex animate-pop items-center gap-2 motion-reduce:animate-none">
      <Sparkles aria-hidden className="size-5 animate-pulse motion-reduce:animate-none" strokeWidth={2.2} />
      {t.moderation.checking}
    </span>
  );
}

/** A scanner line over the card (or the form) during the AI check. Place inside a relative box. */
export function ScanOverlay({ active, className = 'rounded-2xl' }: { active: boolean; className?: string }) {
  if (!active) return null;
  return <span aria-hidden className={`ai-scan ${className}`} />;
}

/** The fix hint for the flagged part of the card ("Remove or replace file 2"). */
export function useFixHint() {
  const t = useT();
  return (rejection: Rejection | null, fileNumber: number | null): string | null => {
    if (!rejection) return null;
    if (rejection.field === 'needed') return t.moderation.fix.needed;
    if (rejection.field === 'offered') return t.moderation.fix.offered;
    if (rejection.field === 'file' && fileNumber !== null) return t.moderation.fix.file(fileNumber);
    return null;
  };
}

/** Each rule category has its own icon and colours (gradient border, icon, chip). */
/** ink / night: text in the light and dark theme, ≥ 4.5:1 on the card. */
const CATEGORY_LOOK: Record<Violation, { Icon: LucideIcon; from: string; to: string; ink: string; night: string }> = {
  abuse: { Icon: MessageSquareWarning, from: '#E5484D', to: '#F6339A', ink: '#BE123C', night: '#FDA4AF' },
  money: { Icon: Banknote, from: '#F59E0B', to: '#EA580C', ink: '#B45309', night: '#FCD34D' },
  cheating: { Icon: GraduationCap, from: '#6366F1', to: '#AD46FF', ink: '#4F46E5', night: '#C4B5FD' },
  spam: { Icon: CircleOff, from: '#64748B', to: '#8B5CF6', ink: '#475569', night: '#CBD5E1' },
};

/** Scrolls to the flagged field (marked with data-check-field) and puts the cursor in it. */
function goToField(from: HTMLElement, field: ViolationField) {
  const root: ParentNode = from.closest('dialog[open]') ?? document;
  const target = root.querySelector<HTMLElement>(`[data-check-field="${field}"]`);
  if (!target) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  target.querySelector<HTMLElement>('textarea, input, label[for], button')?.focus({ preventScroll: true });
}

/**
 * Why the AI did not let the card through, and what to fix: a card in the colours of the
 * rule category that springs up above the button; "Fix" jumps to the flagged field.
 */
export function RejectionNotice({ rejection, fix, edit = false }: { rejection: Rejection; fix: string | null; edit?: boolean }) {
  const t = useT();
  const { Icon, from, to, ink, night } = CATEGORY_LOOK[rejection.category];
  const tint = { '--ink': ink, '--night': night } as CSSProperties;
  const field = rejection.field;
  return (
    <div
      role="alert"
      style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
      className="notice-spring rounded-[26px] p-[1.5px] shadow-[0_14px_36px_rgba(27,21,48,0.16)]"
    >
      <div
        style={{ backgroundImage: `radial-gradient(120% 90% at 0% 0%, ${from}1f, transparent 60%)` }}
        className="flex flex-col gap-3 rounded-[24.5px] bg-surface p-4"
      >
        <div className="flex items-start gap-3.5">
          <span
            style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})`, boxShadow: `0 8px 22px ${from}66` }}
            className="notice-icon flex size-12 shrink-0 items-center justify-center rounded-2xl text-white"
          >
            <Icon aria-hidden className="size-6" strokeWidth={2.2} />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <span
              style={{ ...tint, backgroundColor: `${from}1f` }}
              className="flex w-fit items-center text-[var(--ink)] dark:text-[var(--night)] gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold tracking-[0.6px] uppercase"
            >
              <Sparkles aria-hidden className="size-3" strokeWidth={2.6} />
              {t.moderation.chip} · {t.moderation.categories[rejection.category]}
            </span>
            <p className="font-bricolage text-[17px] leading-6 font-extrabold text-ink">
              {edit ? t.moderation.rejectedEditTitle : t.moderation.rejectedTitle}
            </p>
            <p className="text-[13px] leading-[19px] font-medium text-muted">{t.moderation.reasons[rejection.category]}</p>
          </div>
        </div>
        {fix && field && (
          <button
            type="button"
            onClick={(event) => goToField(event.currentTarget, field)}
            style={{ ...tint, borderColor: `${from}66`, backgroundColor: `${from}14` }}
            className="group flex text-[var(--ink)] dark:text-[var(--night)] h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-2xl border px-4 text-[13px] font-bold transition hover:brightness-110 active:scale-[0.98]"
          >
            <span className="flex min-w-0 items-center gap-2">
              <PenLine aria-hidden className="size-4 shrink-0" strokeWidth={2.4} />
              <span className="truncate">{fix}</span>
            </span>
            <ArrowRight
              aria-hidden
              className="size-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1"
              strokeWidth={2.4}
            />
          </button>
        )}
      </div>
    </div>
  );
}

/** The AI could not check the card: a moderator will. */
export function PendingNotice({ text }: { text: string }) {
  return (
    <div
      role="status"
      className="flex animate-rise items-start gap-3 rounded-2xl bg-brand-soft p-3.5 motion-reduce:animate-none"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-brand-fill-from to-brand-fill-to text-white">
        <Clock aria-hidden className="size-5" strokeWidth={2.2} />
      </span>
      <p className="text-[13px] leading-[19px] font-semibold text-ink">{text}</p>
    </div>
  );
}

/** Other problems on Publish / Save, shown as the same card as a rejection. */
export type ErrorKind = 'error' | 'limit' | 'files';

const ERROR_LOOK: Record<ErrorKind, { Icon: LucideIcon; from: string; to: string; ink: string; night: string }> = {
  error: { Icon: CloudOff, from: '#E5484D', to: '#AD46FF', ink: '#BE123C', night: '#FDA4AF' },
  limit: { Icon: Hourglass, from: '#F59E0B', to: '#F6339A', ink: '#B45309', night: '#FCD34D' },
  files: { Icon: FileWarning, from: '#F97316', to: '#E5484D', ink: '#C2410C', night: '#FDBA74' },
};

/** A save / upload / limit error: gradient card with an icon, springs up above the button. */
export function ErrorNotice({ kind, text }: { kind: ErrorKind; text: string }) {
  const t = useT();
  const { Icon, from, to, ink, night } = ERROR_LOOK[kind];
  return (
    <div
      role="alert"
      style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
      className="notice-spring rounded-[26px] p-[1.5px] shadow-[0_14px_36px_rgba(27,21,48,0.16)]"
    >
      <div
        style={{ backgroundImage: `radial-gradient(120% 90% at 0% 0%, ${from}1f, transparent 60%)` }}
        className="flex items-center gap-3.5 rounded-[24.5px] bg-surface p-4"
      >
        <span
          style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})`, boxShadow: `0 8px 22px ${from}66` }}
          className="notice-icon flex size-12 shrink-0 items-center justify-center rounded-2xl text-white"
        >
          <Icon aria-hidden className="size-6" strokeWidth={2.2} />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p
            style={{ '--ink': ink, '--night': night } as CSSProperties}
            className="font-bricolage text-[16px] leading-6 font-extrabold text-[var(--ink)] dark:text-[var(--night)]"
          >
            {kind === 'limit' ? t.moderation.limitTitle : t.moderation.errorTitle}
          </p>
          <p className="text-[13px] leading-[19px] font-medium text-ink">{text}</p>
        </div>
      </div>
    </div>
  );
}
