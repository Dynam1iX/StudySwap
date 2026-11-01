'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Loader2, LockKeyhole } from 'lucide-react';
import { ModerationList } from '@/components/admin/ModerationList';
import { StatsPanel } from '@/components/admin/StatsPanel';
import { AppHeader } from '@/components/layout/AppHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { MobileShell } from '@/components/layout/MobileShell';
import { Toast, useToast } from '@/components/ui/Toast';
import {
  amIAdmin,
  deleteCardAsAdmin,
  fetchAdminCards,
  fetchAdminStats,
  type AdminCard,
  type AdminStats,
  type DeleteReason,
} from '@/lib/admin';
import { messages, useT } from '@/i18n';

type LoadState =
  | { status: 'loading' }
  | { status: 'denied' }
  | { status: 'error'; message: string }
  | { status: 'ready'; cards: AdminCard[]; stats: AdminStats };

/**
 * Administrator page: statistics from the database (End-term C5) and moderation of every
 * card (requirement R7). The database checks the role in every function; this page only
 * decides what to show.
 */
export default function AdminPage() {
  const t = useT();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const { toast, show: showToast, hide: hideToast } = useToast();

  const load = useCallback(async () => {
    try {
      if (!(await amIAdmin())) {
        setState({ status: 'denied' });
        return;
      }
      const [cards, stats] = await Promise.all([fetchAdminCards(), fetchAdminStats()]);
      setState({ status: 'ready', cards, stats });
    } catch (err: unknown) {
      console.error('Error loading the admin panel:', err);
      setState({ status: 'error', message: err instanceof Error ? err.message : messages().admin.loadError });
    }
  }, []);

  useEffect(() => {
    // Async: state changes after the requests answer, not during the effect.
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const deleteCard = async (card: AdminCard, reason: DeleteReason) => {
    await deleteCardAsAdmin(card.id, reason);
    showToast(t.admin.deleted);
    // Totals and charts change with the card gone.
    fetchAdminStats()
      .then((stats) => setState((prev) => (prev.status === 'ready' ? { ...prev, stats } : prev)))
      .catch((err: unknown) => console.error('Error refreshing statistics:', err));
  };

  const removeFromList = (id: string) =>
    setState((prev) => (prev.status === 'ready' ? { ...prev, cards: prev.cards.filter((card) => card.id !== id) } : prev));

  const footer = (
    <div className="relative">
      <Toast toast={toast} onHide={hideToast} />
      <BottomNav active="profile" />
    </div>
  );

  return (
    <MobileShell wide footer={footer}>
      <AppHeader />

      <div className="flex flex-col gap-4 px-4 py-2">
        <div className="flex animate-rise flex-col gap-2 motion-reduce:animate-none">
          <Link
            href="/profile"
            className="-ml-1 flex w-fit items-center gap-0.5 rounded-full py-1 pr-2 text-sm font-semibold text-muted transition hover:text-ink"
          >
            <ChevronLeft aria-hidden className="size-4.5" />
            {t.admin.back}
          </Link>
          <h1 className="font-bricolage text-[26px] leading-8 font-extrabold text-ink">{t.admin.title}</h1>
          <p className="text-sm font-medium text-muted">{t.admin.subtitle}</p>
        </div>

        {state.status === 'loading' && (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-muted">
            <Loader2 className="size-6 animate-spin text-brand-from" />
            <span className="text-xs font-medium">{t.admin.loading}</span>
          </div>
        )}

        {state.status === 'denied' && (
          <div className="flex animate-pop flex-col items-center gap-3 rounded-3xl border border-line bg-surface px-6 py-12 text-center motion-reduce:animate-none">
            <span className="flex size-14 items-center justify-center rounded-full bg-brand-soft">
              <LockKeyhole aria-hidden className="size-6 text-brand-from" />
            </span>
            <p className="text-sm font-semibold text-ink">{t.admin.noAccess}</p>
          </div>
        )}

        {state.status === 'error' && (
          <p className="rounded-2xl border border-danger-line bg-surface p-6 text-center text-sm font-medium text-danger-ink">
            {state.message}
          </p>
        )}

        {state.status === 'ready' && (
          // Phones: statistics, then moderation. Desktop: side by side.
          <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start lg:gap-6">
            <section style={{ animationDelay: '80ms' }} className="flex animate-rise flex-col gap-3 motion-reduce:animate-none">
              <h2 className="font-bricolage text-lg font-extrabold text-ink">{t.admin.statsTitle}</h2>
              <StatsPanel stats={state.stats} />
            </section>
            <div style={{ animationDelay: '160ms' }} className="animate-rise motion-reduce:animate-none">
              <ModerationList cards={state.cards} onDelete={deleteCard} onRemoved={removeFromList} />
            </div>
          </div>
        )}
      </div>
    </MobileShell>
  );
}
