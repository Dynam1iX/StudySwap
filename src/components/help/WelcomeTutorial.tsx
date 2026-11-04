'use client';

import { useEffect, useId, useState } from 'react';
import { PlayCircle, Sparkles, X } from 'lucide-react';
import { HelpSheet } from '@/components/help/HelpSheet';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { TUTORIAL_KEY, useMyId } from '@/lib/auth';
import { useT } from '@/i18n';

/**
 * After each sign-in on a device (the first visit and after Log out), the Feed offers the
 * how-to video once: Watch opens "How StudySwap works", Close dismisses it. Log out forgets
 * the choice (lib/auth signOut).
 */
export function WelcomeTutorial() {
  const t = useT();
  const titleId = useId();
  const myId = useMyId();
  const [offer, setOffer] = useState(false);
  const [watching, setWatching] = useState(false);

  useEffect(() => {
    if (!myId) return;
    let seen: string | null = null;
    try {
      seen = localStorage.getItem(TUTORIAL_KEY);
    } catch {
      return; // Storage blocked: never nag on every visit.
    }
    if (seen === myId) return;
    // A moment after the Feed appears, so the popup does not cover the first paint.
    const timer = window.setTimeout(() => setOffer(true), 600);
    return () => window.clearTimeout(timer);
  }, [myId]);

  const remember = () => {
    try {
      if (myId) localStorage.setItem(TUTORIAL_KEY, myId);
    } catch {
      // ignore
    }
  };
  const close = () => {
    remember();
    setOffer(false);
  };
  const watch = () => {
    remember();
    setOffer(false);
    setWatching(true);
  };

  return (
    <>
      <BottomSheet
        open={offer}
        onClose={close}
        labelledBy={titleId}
        header={
          <div className="flex justify-end px-6 py-2">
            <button
              type="button"
              onClick={close}
              aria-label={t.common.close}
              className="flex size-11 cursor-pointer items-center justify-center rounded-full bg-soft text-ink transition hover:bg-line focus-visible:outline-2 focus-visible:outline-brand-from"
            >
              <X className="size-5" strokeWidth={2.4} />
            </button>
          </div>
        }
      >
        <div className="flex flex-col items-center gap-4 px-6 pt-2 pb-8 text-center">
          <span className="halo relative mt-2 flex size-20 animate-pop items-center justify-center rounded-[28px] bg-linear-to-br from-brand-from to-brand-to text-white shadow-[0_14px_32px_rgba(173,70,255,0.35)] motion-reduce:animate-none">
            <PlayCircle aria-hidden className="size-10" strokeWidth={2} />
            <Sparkles aria-hidden className="absolute -top-2 -right-2 size-6 animate-float text-brand-to motion-reduce:animate-none" />
          </span>
          <div className="flex flex-col gap-1.5">
            <h2 id={titleId} className="font-bricolage text-[24px] leading-8 font-extrabold text-ink">
              {t.tutorial.title}
            </h2>
            <p className="text-[15px] leading-[22px] font-medium text-muted">{t.tutorial.text}</p>
          </div>
          <div className="flex w-full flex-col gap-2.5">
            <button
              type="button"
              onClick={watch}
              className="shine flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-brand-fill-from to-brand-fill-to text-[17px] font-bold text-white shadow-[0_8px_20px_rgba(200,40,140,0.28)] transition active:scale-[0.98]"
            >
              <PlayCircle aria-hidden className="size-5" strokeWidth={2.4} />
              {t.tutorial.watch}
            </button>
            <button
              type="button"
              onClick={close}
              className="h-12 w-full cursor-pointer rounded-2xl border border-line-strong bg-surface text-[15px] font-bold text-ink transition hover:bg-soft active:scale-[0.98]"
            >
              {t.tutorial.close}
            </button>
          </div>
        </div>
      </BottomSheet>
      <HelpSheet open={watching} onClose={() => setWatching(false)} />
    </>
  );
}
