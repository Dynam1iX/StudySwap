'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FeedPostCard } from '@/components/feed/FeedPostCard';
import { FeedSkeleton } from '@/components/feed/FeedSkeleton';
import { SubjectFilter, type SubjectFilterValue } from '@/components/feed/SubjectFilter';
import { SwapDetailModal } from '@/components/feed/SwapDetailModal';
import { AppHeader } from '@/components/layout/AppHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { MobileShell } from '@/components/layout/MobileShell';
import { WelcomeTutorial } from '@/components/help/WelcomeTutorial';
import { useFavoriteIds } from '@/lib/favorites';
import { fetchFeed, type FeedPost } from '@/lib/feed';
import type { Subject } from '@/types/database';
import { Toast, useToast } from '@/components/ui/Toast';
import { useT } from '@/i18n';

export default function FeedPage() {
  const t = useT();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  /** The Feed could not be loaded (shown instead of "no cards"). */
  const [loadFailed, setLoadFailed] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<SubjectFilterValue>('All');
  const { liked: likedPosts, toggle: toggleLike } = useFavoriteIds();
  /** The card whose details modal is open, or null. */
  const [activeSwap, setActiveSwap] = useState<FeedPost | null>(null);
  const { toast, show: showToast, hide: hideToast } = useToast();
  /** ?card=<code> from a card link (/c/...): open that card's details once the Feed is in. */
  const cardCode = useSearchParams().get('card');
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    fetchFeed()
      .then((data) => {
        if (cancelled) return;
        setPosts(data.posts);
        setSubjects(data.subjects);
        setLoadFailed(false);
      })
      .catch((err: unknown) => {
        console.error('Error fetching data from Supabase:', err);
        if (!cancelled) setLoadFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Hidden by Next (another tab opened): close the sheet, or it opens again on return.
  useLayoutEffect(() => () => setActiveSwap(null), []);

  useEffect(() => {
    if (!cardCode || loading) return;
    router.replace('/', { scroll: false });
    const code = cardCode.toLowerCase();
    if (!/^[0-9a-f]{8}$/.test(code)) {
      queueMicrotask(() => showToast(t.card.cardNotFound));
      return;
    }
    const open = (list: FeedPost[]) => {
      const post = list.find((p) => p.id.startsWith(code));
      // A card link that no longer works (deleted or inactive card) gets a short note.
      if (post) setActiveSwap(post);
      else showToast(t.card.cardNotFound);
    };
    if (posts.some((p) => p.id.startsWith(code))) {
      queueMicrotask(() => open(posts));
      return;
    }
    // Not in the list on screen (a newer card, or the list is from before): load it again.
    let cancelled = false;
    fetchFeed()
      .then((data) => {
        if (cancelled) return;
        setPosts(data.posts);
        setSubjects(data.subjects);
        open(data.posts);
      })
      .catch(() => !cancelled && showToast(t.card.cardNotFound));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardCode, loading]);

  const visiblePosts =
    selectedSubject === 'All'
      ? posts
      : posts.filter((post) => post.needed?.id === selectedSubject || post.offered?.id === selectedSubject);

  return (
    <MobileShell
      wide
      footer={
        <div className="relative">
          <Toast toast={toast} onHide={hideToast} />
          <BottomNav active="feed" />
        </div>
      }
    >
      <AppHeader />
      <div className="animate-rise motion-reduce:animate-none">
        <SubjectFilter subjects={subjects} value={selectedSubject} onChange={setSelectedSubject} />
      </div>

      <div style={{ animationDelay: '80ms' }} className="animate-rise px-4 pt-3 pb-1 motion-reduce:animate-none">
        <h1 className="font-bricolage text-[22px] leading-[26px] font-bold text-ink lg:text-[32px] lg:leading-10">{t.feed.title}</h1>
      </div>

      {/* key: the list fades in again whenever the subject filter changes */}
      <main
        key={String(selectedSubject)}
        className="w-full space-y-4 p-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:space-y-0 xl:grid-cols-3"
      >
        {loading ? (
          <FeedSkeleton />
        ) : loadFailed && posts.length === 0 ? (
          <div className="flex animate-pop flex-col items-center gap-3 rounded-2xl border border-danger-line bg-surface p-6 py-12 text-center motion-reduce:animate-none lg:col-span-full">
            <p className="text-sm font-semibold text-danger-ink">{t.feed.loadError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="h-11 cursor-pointer rounded-xl bg-linear-to-r from-brand-fill-from to-brand-fill-to px-5 text-sm font-bold text-white active:scale-95"
            >
              {t.common.tryAgain}
            </button>
          </div>
        ) : visiblePosts.length === 0 ? (
          <div className="animate-pop rounded-2xl border border-line bg-surface p-6 py-16 text-center text-xs font-medium text-muted motion-reduce:animate-none lg:col-span-full">
            {t.feed.empty}
          </div>
        ) : (
          visiblePosts.map((post, index) => (
            <div
              key={post.id}
              style={{ animationDelay: `${120 + Math.min(index, 5) * 70}ms` }}
              className="animate-rise motion-reduce:animate-none"
            >
              <FeedPostCard
                post={post}
                liked={likedPosts.has(post.id)}
                onToggleLike={toggleLike}
                onOpen={setActiveSwap}
              />
            </div>
          ))
        )}
      </main>

      <SwapDetailModal post={activeSwap} onClose={() => setActiveSwap(null)} />

      <WelcomeTutorial />
    </MobileShell>
  );
}
