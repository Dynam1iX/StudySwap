'use client';

import { useLayoutEffect, useState } from 'react';
import { ArrowUpRight, Mail } from 'lucide-react';
import { useAvatarUrl } from '@/lib/avatar';
import type { FeedAuthor, PostContact } from '@/lib/feed';
import { formatStudyInfo, getInitials, getShortName } from '@/lib/format';
import { STUDENT_AVATAR_TRANSITION, studentAvatarReady } from '@/lib/student';
import { ViewableAvatar } from '@/components/ui/AvatarViewer';
import { useT } from '@/i18n';

interface StudentHeaderCardProps {
  author: FeedAuthor;
  /** undefined while loading; null when the student has no contact to show. */
  contact: PostContact | null | undefined;
  /** "About me"; empty or undefined while loading = not shown. */
  bio?: string;
}

function contactHref(contact: PostContact, name: string): string {
  if (contact.method === 'telegram') return `https://t.me/${contact.value}`;
  const subject = encodeURIComponent('StudySwap');
  const body = encodeURIComponent(`Hi ${name}! I found your profile on StudySwap and would like to connect.`);
  return `mailto:${contact.value}?subject=${subject}&body=${body}`;
}

/** Photo, name, major and year, and how to reach the student. */
export function StudentHeaderCard({ author, contact, bio }: StudentHeaderCardProps) {
  const t = useT();
  const name = author.full_name || 'AITU Student';
  const initials = getInitials(name);
  const url = useAvatarUrl(author.avatar_path);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showPhoto = url !== null && url !== failedUrl;

  // The avatar is on screen: let the tapped one fly into it.
  useLayoutEffect(() => {
    studentAvatarReady();
  }, []);

  return (
    <div className="@container flex flex-col gap-4 rounded-3xl border border-line bg-surface p-4">
      <div className="flex items-center gap-4">
        <ViewableAvatar
          url={showPhoto ? url : null}
          name={getShortName(name)}
          subtitle={formatStudyInfo(t, author.major, author.study_year)}
        >
        <div
          style={{ viewTransitionName: STUDENT_AVATAR_TRANSITION }}
          className="relative size-20 shrink-0 rounded-full p-[3px]"
        >
          <span aria-hidden className="absolute inset-0 rounded-full bg-linear-to-br from-brand-from to-brand-to" />
          <div className="relative flex size-full items-center justify-center overflow-hidden rounded-full border-[3px] border-surface bg-brand-soft">
            {showPhoto ? (
              <img
                key={url}
                src={url}
                alt=""
                draggable={false}
                onError={() => setFailedUrl(url)}
                className="size-full rounded-full object-cover pointer-events-none select-none [-webkit-touch-callout:none]"
              />
            ) : (
              <span className="font-bricolage text-2xl font-extrabold text-brand-ink">{initials}</span>
            )}
          </div>
        </div>
        </ViewableAvatar>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="truncate font-bricolage text-2xl font-extrabold text-ink">{getShortName(name)}</p>
          <p className="text-sm font-medium text-muted">{formatStudyInfo(t, author.major, author.study_year)}</p>
        </div>
      </div>

      {bio && (
        <p className="animate-rise text-[15px] leading-relaxed font-medium whitespace-pre-line break-words text-ink motion-reduce:animate-none">
          {bio}
        </p>
      )}

      {contact === undefined ? (
        <div aria-hidden className="h-12 animate-pulse rounded-2xl bg-soft" />
      ) : contact === null ? (
        <p className="flex h-12 items-center rounded-2xl bg-soft px-3.5 text-sm font-medium text-muted">{t.student.noContact}</p>
      ) : (
        <a
          href={contactHref(contact, name)}
          target={contact.method === 'telegram' ? '_blank' : undefined}
          rel="noreferrer"
          className="group flex h-12 animate-rise items-center justify-between gap-3 rounded-2xl bg-soft px-3.5 transition hover:bg-line active:scale-[0.98] motion-reduce:animate-none"
        >
          <span className="flex min-w-0 items-center gap-2.5 text-base font-semibold text-ink">
            {contact.method === 'telegram' ? (
              <img src="/telegram-circle.svg" alt="" className="size-7 shrink-0" />
            ) : (
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-brand-from to-brand-to text-white">
                <Mail aria-hidden className="size-4" strokeWidth={2.4} />
              </span>
            )}
            <span className="truncate">{contact.method === 'telegram' ? `@${contact.value}` : contact.value}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-ink">
            {/* Narrow card (phones, desktop column): the arrow alone, so the handle or e-mail stays readable. */}
            <span className="sr-only @[460px]:not-sr-only">{t.card.contact[contact.method]}</span>
            <ArrowUpRight
              aria-hidden
              className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              strokeWidth={2.6}
            />
          </span>
        </a>
      )}
    </div>
  );
}
