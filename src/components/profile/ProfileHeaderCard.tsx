'use client';

import { Check } from 'lucide-react';
import type { ProfileUser } from '@/lib/profile';
import { Avatar } from './Avatar';
import { useT } from '@/i18n';
import { formatStudyInfo } from '@/lib/format';

interface ProfileHeaderCardProps {
  user: ProfileUser;
  /** The photo to show (a local preview while a new one uploads). */
  avatarUrl: string | null;
  onEditAvatar?: () => void;
  /** Spins the avatar ring while a new photo uploads. */
  avatarBusy?: boolean;
  /** "Link Telegram" when the student has not linked it yet. */
  onLinkTelegram?: () => void;
}

export function ProfileHeaderCard({ user, avatarUrl, onEditAvatar, avatarBusy, onLinkTelegram }: ProfileHeaderCardProps) {
  const t = useT();
  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-4">
      <div className="flex items-center gap-4">
        <Avatar
          initials={user.initials}
          url={avatarUrl}
          onEdit={onEditAvatar}
          busy={avatarBusy}
          view={{ name: user.displayName, subtitle: formatStudyInfo(t, user.major, user.studyYear) }}
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="truncate font-bricolage text-2xl font-extrabold text-ink">{user.displayName}</p>
          <p className="text-sm font-medium text-muted">
            {formatStudyInfo(t, user.major, user.studyYear)}
          </p>
        </div>
      </div>

      {user.bio && (
        <p className="animate-rise text-[15px] leading-relaxed font-medium whitespace-pre-line break-words text-ink motion-reduce:animate-none">
          {user.bio}
        </p>
      )}

      {user.telegramHandle ? (
        <a
          href={`https://t.me/${user.telegramHandle}`}
          target="_blank"
          rel="noreferrer"
          className="flex h-12 items-center justify-between gap-3 rounded-2xl bg-soft px-3.5 transition hover:bg-line"
        >
          {/* Handles are up to 32 characters: shorten with "…" instead of widening the page. */}
          <span className="flex min-w-0 items-center gap-2.5 text-base font-semibold text-ink">
            <img src="/telegram-circle.svg" alt="" className="size-7 shrink-0" />
            <span className="truncate">@{user.telegramHandle}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-success">
            <Check className="size-3.5" strokeWidth={3} />
            {t.telegram.linked}
          </span>
        </a>
      ) : (
        <button
          type="button"
          onClick={onLinkTelegram}
          className="shine flex h-12 cursor-pointer items-center justify-center gap-2.5 rounded-2xl bg-linear-to-r from-telegram-from to-telegram-to text-base font-bold text-white shadow-[0_6px_16px_rgba(34,158,217,0.3)] transition active:scale-[0.98]"
        >
          <img src="/telegram.svg" alt="" className="size-6 shrink-0" />
          {t.telegram.link}
        </button>
      )}
    </div>
  );
}
