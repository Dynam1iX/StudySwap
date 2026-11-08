'use client';

import { useId } from 'react';
import { X } from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Avatar } from './Avatar';
import { BioSection, SectionTitle, StudentDetails, TelegramSection } from './EditProfileParts';
import type { ProfileUser } from '@/lib/profile';
import { useT } from '@/i18n';

interface EditProfileSheetProps {
  open: boolean;
  onClose: () => void;
  user: ProfileUser;
  avatarUrl: string | null;
  avatarBusy: boolean;
  onEditAvatar: () => void;
  onLinkTelegram: () => void;
  onUnlinkTelegram: () => void;
  onBioSaved: (bio: string) => void;
  onBioError: (message: string) => void;
}

/** Desktop "Edit profile": the same content as the /profile/edit page, in a modal over Profile. */
export function EditProfileSheet({
  open,
  onClose,
  user,
  avatarUrl,
  avatarBusy,
  onEditAvatar,
  onLinkTelegram,
  onUnlinkTelegram,
  onBioSaved,
  onBioError,
}: EditProfileSheetProps) {
  const t = useT();
  const titleId = useId();

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      header={
        <div className="flex items-center justify-between px-6 py-2">
          <h2 id={titleId} className="font-bricolage text-[22px] font-extrabold text-ink">
            {t.edit.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="flex size-11 cursor-pointer items-center justify-center rounded-full bg-soft text-ink transition hover:bg-line focus-visible:outline-2 focus-visible:outline-brand-from"
          >
            <X className="size-5" strokeWidth={2.4} />
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 px-6 pt-2 pb-8">
        <div className="flex justify-center">
          <Avatar initials={user.initials} url={avatarUrl} busy={avatarBusy} onEdit={onEditAvatar} />
        </div>
        <section className="flex flex-col gap-3">
          <SectionTitle>{t.edit.bio}</SectionTitle>
          {/* Re-mounted when the modal opens, so the field starts from the saved bio. */}
          {open && <BioSection bio={user.bio} onSaved={onBioSaved} onError={onBioError} />}
        </section>
        <section className="flex flex-col gap-3">
          <SectionTitle>Telegram</SectionTitle>
          <TelegramSection handle={user.telegramHandle} onLink={onLinkTelegram} onUnlink={onUnlinkTelegram} />
        </section>
        <section className="flex flex-col gap-3">
          <SectionTitle>{t.edit.details}</SectionTitle>
          <StudentDetails user={user} />
        </section>
      </div>
    </BottomSheet>
  );
}
