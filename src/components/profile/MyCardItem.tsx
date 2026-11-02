'use client';

import { paletteFor } from '@/lib/categoryPalette';
import type { ProfileCard, ProfileSubject } from '@/lib/profile';
import type { PostStatus } from '@/types/database';
import { ShareCardButton } from '@/components/feed/ShareCardButton';
import { ExchangeIcon } from '@/components/ui/ExchangeIcon';
import { useT } from '@/i18n';

const STATUS_VIEW: Record<PostStatus, { dot: string; text: string }> = {
  active: { dot: 'var(--color-success)', text: 'var(--color-success)' },
  completed: { dot: 'var(--color-brand-ink)', text: 'var(--color-brand-ink)' },
  archived: { dot: 'var(--color-placeholder)', text: 'var(--color-muted)' },
  pending: { dot: 'var(--color-warning)', text: 'var(--color-warning)' },
};

interface CardHalfProps {
  label: string;
  subject: ProfileSubject;
  topic: string;
}

/** One side of the card: label, subject code and the topic text (3 lines max). */
function CardHalf({ label, subject, topic }: CardHalfProps) {
  const palette = paletteFor(subject.category);

  return (
    <div style={{ backgroundColor: palette.bg }} className="flex min-w-0 flex-col gap-1 rounded-2xl px-4 py-3.5">
      <span style={{ color: palette.label }} className="text-[10px] font-semibold tracking-[0.8px] uppercase">
        {label}
      </span>
      <span style={{ color: palette.title }} className="text-[18px] leading-[22px] font-bold break-words" title={subject.name}>
        {subject.code}
      </span>
      {topic && (
        <p style={{ color: palette.topic }} className="line-clamp-3 text-xs leading-[17px] font-medium break-words">
          {topic}
        </p>
      )}
    </div>
  );
}

interface MyCardItemProps {
  card: ProfileCard;
  onManage?: (cardId: string) => void;
}

/** A barter card in Profile → My cards: needs ⇄ teaches with both topics, status and Manage. */
export function MyCardItem({ card, onManage }: MyCardItemProps) {
  const t = useT();
  const status = STATUS_VIEW[card.status];

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-4">
      <div
        className={`relative grid grid-cols-2 gap-6 transition-[opacity,filter] duration-300 ${
          card.status === 'active' ? '' : 'opacity-60 grayscale-[35%]'
        }`}
      >
        <CardHalf label={t.profile.needs} subject={card.needed} topic={card.neededTopic} />
        <CardHalf label={t.profile.teaches} subject={card.offered} topic={card.offeredTopic} />
        <span className="pointer-events-none absolute top-1/2 left-1/2 flex size-[42px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-surface">
          <ExchangeIcon className="size-9" />
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span style={{ color: status.text }} className="flex items-center gap-1.5 text-xs font-semibold">
          <span aria-hidden style={{ backgroundColor: status.dot }} className="size-2 rounded-sm" />
          {t.profile.status[card.status]}
        </span>
        <div className="flex items-center gap-2">
        {/* Inactive cards have no working link. */}
        {card.status === 'active' && <ShareCardButton card={card} className="size-10" />}
        <button
          type="button"
          onClick={() => onManage?.(card.id)}
          aria-haspopup="dialog"
          className="h-10 w-[88px] cursor-pointer rounded-xl border border-line-strong bg-surface text-xs font-semibold text-ink transition hover:bg-page active:scale-95"
        >
          {t.profile.manage}
        </button>
        </div>
      </div>
    </div>
  );
}
