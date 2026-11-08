'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { MobileShell } from '@/components/layout/MobileShell';
import { Avatar } from '@/components/profile/Avatar';
import { TelegramLinkSheet } from '@/components/profile/TelegramLinkSheet';
import { TelegramUnlinkSheet } from '@/components/profile/TelegramUnlinkSheet';
import { AvatarSheet } from '@/components/profile/AvatarSheet';
import { BioSection, SectionTitle, StudentDetails, TelegramSection } from '@/components/profile/EditProfileParts';
import { useAvatarEditor } from '@/components/profile/useAvatarEditor';
import { Toast, useToast } from '@/components/ui/Toast';
import { fetchProfile, type ProfileUser } from '@/lib/profile';
import { messages, useT } from '@/i18n';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; user: ProfileUser };

/** Profile settings: About me, Telegram link and the student's details (read-only, from Microsoft). */
export default function EditProfilePage() {
  const t = useT();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const { toast, show: showToast, hide: hideToast } = useToast();

  useEffect(() => {
    let cancelled = false;
    fetchProfile()
      .then((data) => {
        if (cancelled) return;
        setState(data ? { status: 'ready', user: data.user } : { status: 'error', message: messages().profile.notFound });
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ status: 'error', message: err instanceof Error ? err.message : messages().profile.loadError });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const avatar = useAvatarEditor(state.status === 'ready' ? state.user : null, {
    notify: showToast,
    onChange: (avatarPath) =>
      setState((prev) =>
        prev.status === 'ready' ? { status: 'ready', user: { ...prev.user, avatarPath } } : prev,
      ),
  });

  const [telegramSheet, setTelegramSheet] = useState<'link' | 'unlink' | null>(null);
  const setHandle = (telegramHandle: string | null) =>
    setState((prev) => (prev.status === 'ready' ? { status: 'ready', user: { ...prev.user, telegramHandle } } : prev));

  return (
    <MobileShell
      footer={
        <div className="relative">
          <Toast toast={toast} onHide={hideToast} />
        </div>
      }
    >
      <AppHeader />

      <div className="flex flex-col gap-4 px-4 py-2">
        <div className="flex animate-rise items-center gap-2 motion-reduce:animate-none">
          <Link
            href="/profile"
            aria-label={t.edit.back}
            className="-ml-2 flex size-11 items-center justify-center rounded-full text-ink transition hover:bg-soft active:scale-90"
          >
            <ChevronLeft className="size-6" strokeWidth={2.4} />
          </Link>
          <h1 className="font-bricolage text-2xl font-extrabold text-ink">{t.edit.title}</h1>
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

        {state.status === 'ready' && (
          <>
            <div style={{ animationDelay: '60ms' }} className="flex animate-rise justify-center motion-reduce:animate-none">
              <Avatar
                initials={state.user.initials}
                url={avatar.displayUrl}
                busy={avatar.busy}
                onEdit={() => avatar.setOpen(true)}
              />
            </div>

            <section style={{ animationDelay: '90ms' }} className="flex animate-rise flex-col gap-3 motion-reduce:animate-none">
              <SectionTitle>{t.edit.bio}</SectionTitle>
              <BioSection
                bio={state.user.bio}
                onSaved={(bio) => {
                  setState((prev) => (prev.status === 'ready' ? { status: 'ready', user: { ...prev.user, bio } } : prev));
                  showToast(t.edit.bioSaved);
                }}
                onError={showToast}
              />
            </section>

            <section style={{ animationDelay: '120ms' }} className="flex animate-rise flex-col gap-3 motion-reduce:animate-none">
              <SectionTitle>Telegram</SectionTitle>
              <TelegramSection
                handle={state.user.telegramHandle}
                onLink={() => setTelegramSheet('link')}
                onUnlink={() => setTelegramSheet('unlink')}
              />
            </section>

            <section style={{ animationDelay: '180ms' }} className="flex animate-rise flex-col gap-3 motion-reduce:animate-none">
              <SectionTitle>{t.edit.details}</SectionTitle>
              <StudentDetails user={state.user} />
            </section>
          </>
        )}
      </div>

      {state.status === 'ready' && (
        <>
          <TelegramLinkSheet
            open={telegramSheet === 'link'}
            onClose={() => setTelegramSheet(null)}
            currentHandle={state.user.telegramHandle}
            onLinked={(handle) => {
              setHandle(handle || null);
              showToast(t.telegram.linkedToast);
            }}
          />
          <TelegramUnlinkSheet
            open={telegramSheet === 'unlink'}
            handle={state.user.telegramHandle}
            onClose={() => setTelegramSheet(null)}
            onUnlinked={() => {
              setHandle(null);
              showToast(t.telegram.unlinkedToast);
            }}
          />
        </>
      )}

      {state.status === 'ready' && (
        <AvatarSheet
          open={avatar.open}
          onClose={() => avatar.setOpen(false)}
          initials={state.user.initials}
          currentUrl={avatar.savedUrl}
          onSave={avatar.save}
          onRemove={avatar.remove}
        />
      )}
    </MobileShell>
  );
}
