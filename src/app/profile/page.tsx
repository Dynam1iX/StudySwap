'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Loader2, LogOut, Pencil, Plus } from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { MobileShell } from '@/components/layout/MobileShell';
import { AvatarSheet } from '@/components/profile/AvatarSheet';
import { EditProfileSheet } from '@/components/profile/EditProfileSheet';
import { ManageCardSheet, type SaveOutcome } from '@/components/profile/ManageCardSheet';
import { MyCardItem } from '@/components/profile/MyCardItem';
import { PrivacySheet } from '@/components/profile/PrivacySheet';
import { ProfileHeaderCard } from '@/components/profile/ProfileHeaderCard';
import { SettingsPanel } from '@/components/profile/SettingsPanel';
import { TelegramLinkSheet } from '@/components/profile/TelegramLinkSheet';
import { TelegramUnlinkSheet } from '@/components/profile/TelegramUnlinkSheet';
import { SubjectChipList } from '@/components/profile/SubjectChipList';
import { useAvatarEditor } from '@/components/profile/useAvatarEditor';
import { Toast, useToast } from '@/components/ui/Toast';
import {
  deleteMyAccount,
  deleteMyCard,
  downloadMyData,
  fetchProfile,
  type ProfileCard,
  type ProfileData,
} from '@/lib/profile';
import { playSound } from '@/lib/sound';
import { amIAdmin } from '@/lib/admin';
import { signOut } from '@/lib/auth';
import { useIsDesktop } from '@/lib/useIsDesktop';
import { messages, useT } from '@/i18n';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'not-found' }
  | { status: 'ready'; data: ProfileData };

/** Fades a block in, each one a little after the previous. */
function Rise({ index, children }: { index: number; children: ReactNode }) {
  return (
    <div style={{ animationDelay: `${index * 70}ms` }} className="animate-rise motion-reduce:animate-none">
      {children}
    </div>
  );
}

const EDIT_BUTTON =
  'flex h-11 cursor-pointer items-center gap-2 rounded-full border border-line-strong bg-surface px-4 text-sm font-semibold text-ink transition hover:bg-soft active:scale-95 disabled:cursor-default';

function SectionTitle({ children }: { children: string }) {
  return <h2 className="font-bricolage text-lg font-extrabold text-ink">{children}</h2>;
}

export default function ProfilePage() {
  const t = useT();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  /** The card whose Manage sheet is open, or null. */
  const [managing, setManaging] = useState<ProfileCard | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  /** Desktop: Edit profile opens as a modal here instead of the /profile/edit page. */
  const desktop = useIsDesktop();
  const [editOpen, setEditOpen] = useState(false);
  const [unlinkingTelegram, setUnlinkingTelegram] = useState(false);
  const { toast, show: showToast, hide: hideToast } = useToast();

  const load = useCallback(() => {
    return fetchProfile()
      .then((data) => setState(data ? { status: 'ready', data } : { status: 'not-found' }))
      .catch((err: unknown) => {
        console.error('Error loading profile from Supabase:', err);
        setState({ status: 'error', message: err instanceof Error ? err.message : messages().profile.loadError });
      });
  }, []);

  useEffect(() => {
    // Also runs again when the page comes back into view (Next keeps it alive while hidden).
    void load();
  }, [load]);

  /** Administrators see an "Admin panel" row in Settings (the database decides who is one). */
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void amIAdmin().then((admin) => {
      if (!cancelled) setIsAdmin(admin);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const avatar = useAvatarEditor(state.status === 'ready' ? state.data.user : null, {
    notify: showToast,
    onChange: (avatarPath) =>
      setState((prev) =>
        prev.status === 'ready'
          ? {
              status: 'ready',
              data: { ...prev.data, user: { ...prev.data.user, avatarPath } },
            }
          : prev,
      ),
  });

  const [loggingOut, setLoggingOut] = useState(false);
  const logOut = async () => {
    setLoggingOut(true);
    await signOut();
    // A full load clears every page Next.js keeps alive in the background.
    window.location.assign('/login');
  };

  const [linkingTelegram, setLinkingTelegram] = useState(false);
  const setTelegramHandle = (telegramHandle: string | null) =>
    setState((prev) =>
      prev.status === 'ready'
        ? { status: 'ready', data: { ...prev.data, user: { ...prev.data.user, telegramHandle } } }
        : prev,
    );
  const telegramLinked = (telegramHandle: string) => {
    setTelegramHandle(telegramHandle || null);
    showToast(t.telegram.linkedToast);
  };

  /** Manage saved the card (through the AI check, see ManageCardSheet). */
  const cardSaved = async (outcome: SaveOutcome) => {
    await load();
    setManaging(null);
    if (outcome === 'completed') playSound('publish');
    showToast(
      outcome === 'pending' ? t.moderation.pendingEdit : outcome === 'completed' ? t.manage.doneToast : t.profile.cardUpdated,
    );
  };

  const removeCard = async (card: ProfileCard) => {
    await deleteMyCard(card.id, card.files);
    await load();
    setManaging(null);
    showToast(t.profile.cardDeleted);
  };

  const footer = (
    <div className="relative">
      <Toast toast={toast} onHide={hideToast} />
      <BottomNav active="profile" />
    </div>
  );

  return (
    <MobileShell wide footer={footer}>
      <AppHeader />

      {/* 16px sides, 8px top and bottom, 16px between blocks. */}
      <div className="flex flex-col gap-4 px-4 py-2">
        <div className="flex items-center justify-between">
          <h1 className="animate-rise font-bricolage text-2xl font-extrabold text-ink motion-reduce:animate-none lg:text-[32px]">{t.profile.title}</h1>
          {desktop ? (
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              disabled={state.status !== 'ready'}
              aria-haspopup="dialog"
              className={EDIT_BUTTON}
            >
              <Pencil className="size-4" />
              {t.profile.edit}
            </button>
          ) : (
            <Link href="/profile/edit" className={EDIT_BUTTON}>
              <Pencil className="size-4" />
              {t.profile.edit}
            </Link>
          )}
        </div>

        {state.status === 'loading' && (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-muted">
            <Loader2 className="size-6 animate-spin text-brand-from" />
            <span className="text-xs font-medium">{t.profile.loading}</span>
          </div>
        )}

        {state.status === 'error' && (
          <p className="rounded-2xl border border-danger-line bg-surface p-6 text-center text-sm font-medium text-danger-ink">
            {state.message}
          </p>
        )}

        {state.status === 'not-found' && (
          <p className="rounded-2xl border border-line bg-surface p-6 text-center text-sm font-medium text-muted">
            {t.profile.notFound}
          </p>
        )}

        {state.status === 'ready' && (
          // Phones: one column. Desktop: student info, subjects and settings on the left,
          // My cards on the right (spanning every row; the last 1fr row takes the slack).
          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[372px_minmax(0,1fr)] lg:grid-rows-[repeat(5,auto)_1fr] lg:gap-x-6">
            <Rise index={0}>
              <ProfileHeaderCard
                user={state.data.user}
                avatarUrl={avatar.displayUrl}
                onEditAvatar={() => avatar.setOpen(true)}
                avatarBusy={avatar.busy}
                onLinkTelegram={() => setLinkingTelegram(true)}
              />
            </Rise>
            <Rise index={1}>
              <SubjectChipList title={t.profile.needHelpWith} subjects={state.data.needsHelp} emptyText={t.profile.nothingYet} />
            </Rise>
            <Rise index={2}>
              <SubjectChipList title={t.profile.canTeach} subjects={state.data.canTeach} emptyText={t.profile.nothingYet} />
            </Rise>

            <section
              style={{ animationDelay: '280ms' }}
              className="flex animate-rise flex-col gap-4 motion-reduce:animate-none lg:col-start-2 lg:row-span-6 lg:row-start-1"
            >
              <SectionTitle>{t.profile.myCards}</SectionTitle>
              {state.data.cards.length === 0 && <p className="text-sm font-medium text-muted lg:hidden">{t.profile.noCards}</p>}
              <ul className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5">
                {state.data.cards.map((card) => (
                  <li key={card.id}>
                    <MyCardItem card={card} onManage={() => setManaging(card)} />
                  </li>
                ))}
                {/* Desktop: a tile that opens Create, next to the cards. */}
                <li className="hidden lg:block">
                  <Link
                    href="/create"
                    className="group flex min-h-[190px] flex-col items-center justify-center gap-2 rounded-3xl border-[1.5px] border-dashed border-field text-sm font-semibold text-muted transition hover:border-brand-from hover:bg-surface hover:text-brand-ink"
                  >
                    <span className="halo relative flex size-11 items-center justify-center rounded-full bg-linear-to-r from-brand-from to-brand-to text-white shadow-[0_6px_16px_rgba(173,70,255,0.3)] transition-transform group-hover:scale-105">
                      <Plus className="size-6 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:rotate-90" strokeWidth={2.5} />
                    </span>
                    {state.data.cards.length === 0 ? (
                      <span className="flex flex-col items-center gap-0.5 px-6 text-center">
                        <span className="text-[15px] font-bold text-ink">{t.profile.noCardsTitle}</span>
                        <span>{t.profile.noCardsHint}</span>
                      </span>
                    ) : (
                      <span className="px-6 text-center">{t.nav.create}</span>
                    )}
                  </Link>
                </li>
              </ul>
            </section>

            <section style={{ animationDelay: '350ms' }} className="flex animate-rise flex-col gap-4 motion-reduce:animate-none">
              <SectionTitle>{t.profile.settings}</SectionTitle>
              <SettingsPanel onOpenPrivacy={() => setPrivacyOpen(true)} showAdmin={isAdmin} />
            </section>

            <button
              type="button"
              onClick={logOut}
              disabled={loggingOut}
              style={{ animationDelay: '420ms' }}
              className="flex h-14 animate-rise cursor-pointer items-center justify-center gap-2 rounded-2xl border border-danger-line bg-surface text-base font-extrabold text-danger-ink transition hover:bg-danger-soft active:scale-[0.98] motion-reduce:animate-none"
            >
              {loggingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
              {t.profile.logOut}
            </button>
          </div>
        )}
      </div>

      <TelegramLinkSheet
        open={linkingTelegram}
        onClose={() => setLinkingTelegram(false)}
        onLinked={telegramLinked}
        currentHandle={state.status === 'ready' ? state.data.user.telegramHandle : null}
      />
      {state.status === 'ready' && (
        <>
          <EditProfileSheet
            open={editOpen}
            onClose={() => setEditOpen(false)}
            user={state.data.user}
            avatarUrl={avatar.displayUrl}
            avatarBusy={avatar.busy}
            onEditAvatar={() => avatar.setOpen(true)}
            onLinkTelegram={() => setLinkingTelegram(true)}
            onUnlinkTelegram={() => setUnlinkingTelegram(true)}
            onBioSaved={(bio) => {
              setState((prev) =>
                prev.status === 'ready' ? { status: 'ready', data: { ...prev.data, user: { ...prev.data.user, bio } } } : prev,
              );
              showToast(t.edit.bioSaved);
            }}
            onBioError={showToast}
          />
          <TelegramUnlinkSheet
            open={unlinkingTelegram}
            handle={state.data.user.telegramHandle}
            onClose={() => setUnlinkingTelegram(false)}
            onUnlinked={() => {
              setTelegramHandle(null);
              showToast(t.telegram.unlinkedToast);
            }}
          />
        </>
      )}
      <ManageCardSheet
        card={managing}
        userId={state.status === 'ready' ? state.data.user.id : ''}
        onClose={() => setManaging(null)}
        onSaved={cardSaved}
        onDelete={removeCard}
      />
      {state.status === 'ready' && (
        <AvatarSheet
          open={avatar.open}
          onClose={() => avatar.setOpen(false)}
          initials={state.data.user.initials}
          currentUrl={avatar.savedUrl}
          onSave={avatar.save}
          onRemove={avatar.remove}
        />
      )}
      {state.status === 'ready' && (
        <PrivacySheet
          open={privacyOpen}
          onClose={() => setPrivacyOpen(false)}
          onDownload={downloadMyData}
          onDeleteAccount={async () => {
            await deleteMyAccount(state.data.user.id);
            await signOut();
            window.location.assign('/login');
          }}
        />
      )}
    </MobileShell>
  );
}
