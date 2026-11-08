'use client';

import { useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Loader2, Share2 } from 'lucide-react';
import { FeedPostCard } from '@/components/feed/FeedPostCard';
import { SwapDetailModal } from '@/components/feed/SwapDetailModal';
import { AppHeader } from '@/components/layout/AppHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { MobileShell } from '@/components/layout/MobileShell';
import { SubjectChipList } from '@/components/profile/SubjectChipList';
import { MatchBanner } from '@/components/student/MatchBanner';
import { StudentHeaderCard } from '@/components/student/StudentHeaderCard';
import { Toast, useToast } from '@/components/ui/Toast';
import { useMyId } from '@/lib/auth';
import { useFavoriteIds } from '@/lib/favorites';
import type { FeedPost } from '@/lib/feed';
import { fetchStudent, knownStudent, overlap, type StudentProfile } from '@/lib/student';
import { messages, useT } from '@/i18n';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'not-found' }
  | { status: 'ready'; data: StudentProfile };

/** Fades a block in, each one a little after the previous. */
function Rise({ index, children }: { index: number; children: ReactNode }) {
  return (
    <div style={{ animationDelay: `${index * 70}ms` }} className="animate-rise motion-reduce:animate-none">
      {children}
    </div>
  );
}

const ROUND_BUTTON =
  'flex h-11 cursor-pointer items-center gap-2 rounded-full border border-line-strong bg-surface px-4 text-sm font-semibold text-ink transition hover:bg-soft active:scale-95 disabled:cursor-default';

function SectionTitle({ children }: { children: string }) {
  return <h2 className="font-bricolage text-lg font-extrabold text-ink">{children}</h2>;
}

/** Another student's profile: photo, name, contact, subjects and active cards. */
export function StudentPage() {
  const t = useT();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const myId = useMyId();
  /** The result for the student it was loaded for; another id means "loading". */
  const [loaded, setLoaded] = useState<{ id: string; state: LoadState } | null>(null);
  const state: LoadState = loaded?.id === id ? loaded.state : { status: 'loading' };
  const { liked, toggle: toggleLike } = useFavoriteIds();
  const [activeSwap, setActiveSwap] = useState<FeedPost | null>(null);
  // Hidden by Next (another tab opened): close the sheet, or it opens again on return.
  useLayoutEffect(() => () => setActiveSwap(null), []);
  const { toast, show: showToast, hide: hideToast } = useToast();
  /** Shown at once from the card that was tapped, before the page has loaded. */
  const preview = knownStudent(id);

  // Your own page is the Profile tab.
  useEffect(() => {
    if (myId && id === myId) router.replace('/profile');
  }, [id, myId, router]);

  useEffect(() => {
    let cancelled = false;
    const setState = (next: LoadState) => {
      if (!cancelled) setLoaded({ id, state: next });
    };
    fetchStudent(id)
      .then((data) => setState(data ? { status: 'ready', data } : { status: 'not-found' }))
      .catch((err: unknown) => {
        console.error('Error loading student from Supabase:', err);
        setState({ status: 'error', message: err instanceof Error ? err.message : messages().student.loadError });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const ready = state.status === 'ready' ? state.data : null;
  const match = useMemo(() => {
    if (!ready) return null;
    const data = ready;
    const theyHelp = overlap(data.canTeach, data.mine.needsHelp);
    const youHelp = overlap(data.needsHelp, data.mine.canTeach);
    return {
      theyHelp,
      youHelp,
      teachIds: new Set(theyHelp.map((s) => s.id)),
      needIds: new Set(youHelp.map((s) => s.id)),
    };
  }, [ready]);

  const back = () => {
    if (window.history.length > 1) router.back();
    else router.push('/');
  };

  const share = async () => {
    const url = `${window.location.origin}/u/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast(t.student.linkCopied);
    } catch {
      showToast(t.student.copyFailed);
    }
  };

  const author = state.status === 'ready' ? state.data.author : preview;

  const footer = (
    <div className="relative">
      <Toast toast={toast} onHide={hideToast} />
      <BottomNav />
    </div>
  );

  return (
    <MobileShell wide footer={footer}>
      <AppHeader />

      <div className="flex flex-col gap-4 px-4 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 animate-rise items-center gap-1 motion-reduce:animate-none">
            <button
              type="button"
              onClick={back}
              aria-label={t.common.back}
              className="-ml-2 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink transition hover:bg-soft active:scale-90"
            >
              <ChevronLeft className="size-6" strokeWidth={2.4} />
            </button>
            <h1 className="font-bricolage text-2xl font-extrabold text-ink lg:text-[32px]">{t.profile.title}</h1>
          </div>
          <button type="button" onClick={share} disabled={!author} className={`${ROUND_BUTTON} animate-rise motion-reduce:animate-none`}>
            <Share2 className="size-4" />
            {t.student.share}
          </button>
        </div>

        {state.status === 'error' && (
          <p className="rounded-2xl border border-danger-line bg-surface p-6 text-center text-sm font-medium text-danger-ink">
            {state.message}
          </p>
        )}

        {state.status === 'not-found' && (
          <p className="animate-pop rounded-2xl border border-line bg-surface p-6 text-center text-sm font-medium text-muted motion-reduce:animate-none">
            {t.student.notFound}
          </p>
        )}

        {state.status === 'loading' && !author && (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-muted">
            <Loader2 className="size-6 animate-spin text-brand-from" />
            <span className="text-xs font-medium">{t.student.loading}</span>
          </div>
        )}

        {author && (state.status === 'ready' || state.status === 'loading') && (
          // Same grid as your own Profile: student and subjects on the left, cards on the right.
          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[372px_minmax(0,1fr)] lg:grid-rows-[repeat(3,auto)_1fr] lg:gap-x-6">
            <StudentHeaderCard
              author={author}
              contact={state.status === 'ready' ? state.data.contact : undefined}
              bio={state.status === 'ready' ? state.data.bio : undefined}
            />

            {state.status === 'loading' ? (
              <div aria-hidden className="flex flex-col gap-4">
                <div className="h-24 animate-pulse rounded-3xl bg-soft" />
                <div className="h-24 animate-pulse rounded-3xl bg-soft" />
              </div>
            ) : (
              <>
                {match && (match.theyHelp.length > 0 || match.youHelp.length > 0) && (
                  <Rise index={1}>
                    <MatchBanner theyHelp={match.theyHelp} youHelp={match.youHelp} />
                  </Rise>
                )}
                <Rise index={2}>
                  <SubjectChipList
                    title={t.student.canTeach}
                    subjects={state.data.canTeach}
                    emptyText={t.profile.nothingYet}
                    showAdd={false}
                    highlight={match?.teachIds}
                    highlightLabel={t.student.matchChip}
                  />
                </Rise>
                <Rise index={3}>
                  <SubjectChipList
                    title={t.student.needHelpWith}
                    subjects={state.data.needsHelp}
                    emptyText={t.profile.nothingYet}
                    showAdd={false}
                    highlight={match?.needIds}
                    highlightLabel={t.student.matchChip}
                  />
                </Rise>

                <section
                  style={{ animationDelay: '280ms' }}
                  className="flex animate-rise flex-col gap-4 motion-reduce:animate-none lg:col-start-2 lg:row-span-4 lg:row-start-1"
                >
                  <SectionTitle>{t.student.cards}</SectionTitle>
                  {state.data.cards.length === 0 ? (
                    <p className="rounded-2xl border border-line bg-surface p-6 text-center text-sm font-medium text-muted">
                      {t.student.noCards}
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5">
                      {state.data.cards.map((card, index) => (
                        <li
                          key={card.id}
                          style={{ animationDelay: `${320 + Math.min(index, 5) * 70}ms` }}
                          className="animate-rise motion-reduce:animate-none"
                        >
                          <FeedPostCard
                            post={card}
                            liked={liked.has(card.id)}
                            onToggleLike={toggleLike}
                            onOpen={setActiveSwap}
                            linkAuthor={false}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}
          </div>
        )}
      </div>

      <SwapDetailModal post={activeSwap} onClose={() => setActiveSwap(null)} linkAuthor={false} />
    </MobileShell>
  );
}
