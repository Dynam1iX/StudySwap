'use client';

import { Clock, Loader2, ShieldAlert, Sparkles } from 'lucide-react';
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

/** Why the AI did not let the card through, and what to fix. Slides in above the button. */
export function RejectionNotice({ rejection, fix, edit = false }: { rejection: Rejection; fix: string | null; edit?: boolean }) {
  const t = useT();
  return (
    <div
      role="alert"
      className="flex animate-rise items-start gap-3 rounded-2xl border border-danger-line bg-danger-soft p-3.5 motion-reduce:animate-none"
    >
      <span className="flex size-9 shrink-0 animate-pop items-center justify-center rounded-xl bg-danger-ink text-white shadow-[0_6px_14px_rgba(192,38,75,0.3)] motion-reduce:animate-none">
        <ShieldAlert aria-hidden className="size-5" strokeWidth={2.2} />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-sm font-bold text-danger-ink">{edit ? t.moderation.rejectedEditTitle : t.moderation.rejectedTitle}</p>
        <p className="text-xs leading-[18px] font-medium text-ink">{t.moderation.reasons[rejection.category]}</p>
        {fix && <p className="mt-1 text-xs font-bold text-danger-ink">{fix}</p>}
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
