'use client';

import { useEffect, useId, useState } from 'react';
import { Clock, Loader2, Trash2, X } from 'lucide-react';
import { TOPICS_MAX_LENGTH } from '@/components/create/TopicsField';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { AttachmentsField, itemsFromFiles, type AttachmentItem } from '@/components/files/AttachmentsField';
import {
  CheckingLabel,
  ErrorNotice,
  RejectionNotice,
  ScanOverlay,
  useFixHint,
  type CheckPhase,
  type ErrorKind,
} from '@/components/moderation/AiCheck';
import { paletteFor } from '@/lib/categoryPalette';
import { setMyCardStatus, type ProfileCard } from '@/lib/profile';
import { editCard, useFileUploads, type Rejection } from '@/lib/publish';
import type { UploadedFile } from '@/lib/moderation';
import { playSound } from '@/lib/sound';
import { useT } from '@/i18n';

/** An error with the look of its card (upload, hourly limit). */
class NoticeError extends Error {
  constructor(
    readonly kind: ErrorKind,
    message: string,
  ) {
    super(message);
  }
}

/** saved: the changes are live. pending: the AI could not check them, a moderator will. */
export type SaveOutcome = 'saved' | 'pending';

interface ManageCardSheetProps {
  /** The card to manage, or null when the sheet is closed. */
  card: ProfileCard | null;
  /** Signed-in student: new files are uploaded to their folder. */
  userId: string;
  onClose: () => void;
  /** After a save: reload the cards, close the sheet, say so. */
  onSaved: (outcome: SaveOutcome) => Promise<void>;
  onDelete: (card: ProfileCard) => Promise<void>;
}

/** Manage one of my cards: edit both topic texts, active ⇄ inactive, delete. Subjects stay fixed. */
export function ManageCardSheet({ card, userId, onClose, onSaved, onDelete }: ManageCardSheetProps) {
  const t = useT();
  const titleId = useId();
  // Keep the last card on screen while the sheet animates out.
  const [lastCard, setLastCard] = useState(card);
  /** Counts openings, so every opening gets a fresh form (even for the same card). */
  const [session, setSession] = useState(0);
  if (card && card !== lastCard) {
    setLastCard(card);
    setSession((n) => n + 1);
  }
  const data = card ?? lastCard;

  return (
    <BottomSheet
      open={card !== null}
      onClose={onClose}
      labelledBy={titleId}
      header={
        <div className="flex items-center justify-between px-6 py-2">
          <h2 id={titleId} className="font-bricolage text-[22px] font-extrabold text-ink">
            {t.manage.title}
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
      {/* key: a fresh form every time the sheet opens */}
      {data && (
        <ManageForm key={`${data.id}-${session}`} card={data} userId={userId} onSaved={onSaved} onDelete={onDelete} />
      )}
    </BottomSheet>
  );
}

function SubjectLine({ label, card, side }: { label: string; card: ProfileCard; side: 'needed' | 'offered' }) {
  const subject = card[side];
  const palette = paletteFor(subject.category);
  return (
    <div style={{ backgroundColor: palette.bg }} className="flex min-w-0 flex-1 flex-col gap-0.5 rounded-2xl px-3.5 py-3">
      <span style={{ color: palette.label }} className="text-[10px] font-semibold tracking-[0.8px] uppercase">
        {label}
      </span>
      <span style={{ color: palette.title }} className="truncate text-[15px] font-bold" title={subject.name}>
        {subject.name}
      </span>
    </div>
  );
}

function TopicInput({
  label,
  value,
  onChange,
  error = null,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** The AI check objected to this text: red outline and the fix under it. */
  error?: string | null;
}) {
  const near = value.length >= TOPICS_MAX_LENGTH - 20;
  return (
    <label className={`flex flex-col gap-1.5 ${error ? 'animate-shake motion-reduce:animate-none' : ''}`}>
      <span className="text-[14px] font-bold text-ink">{label}</span>
      <span className="relative">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value.slice(0, TOPICS_MAX_LENGTH))}
          rows={2}
          className={`w-full resize-none rounded-[14px] border p-3 pb-7 text-[16px] leading-relaxed font-semibold text-ink outline-none transition sm:text-[14px] ${
            error ? 'border-danger ring-2 ring-red-100' : 'border-field focus:border-brand-from'
          }`}
        />
        <span
          className={`absolute right-3 bottom-2 text-[12px] font-semibold select-none ${near ? 'text-amber-600' : 'text-muted'}`}
        >
          {value.length} / {TOPICS_MAX_LENGTH}
        </span>
      </span>
      {error && <span className="text-[12px] font-semibold text-danger">{error}</span>}
    </label>
  );
}

function ManageForm({
  card,
  userId,
  onSaved,
  onDelete,
}: {
  card: ProfileCard;
  userId: string;
  onSaved: ManageCardSheetProps['onSaved'];
  onDelete: ManageCardSheetProps['onDelete'];
}) {
  const t = useT();
  const [neededTopic, setNeededTopic] = useState(card.neededTopic);
  const [offeredTopic, setOfferedTopic] = useState(card.offeredTopic);
  const [active, setActive] = useState(card.status === 'active');
  const [files, setFiles] = useState<AttachmentItem[]>(() => itemsFromFiles(card.files));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);
  const [error, setError] = useState<{ kind: ErrorKind; text: string } | null>(null);
  /** Uploading new files, then the AI check of the new texts and files. */
  const [phase, setPhase] = useState<CheckPhase>('idle');
  const [rejection, setRejection] = useState<Rejection | null>(null);
  const [rejectCount, setRejectCount] = useState(0);
  const uploads = useFileUploads();
  const fixHint = useFixHint();
  const pending = card.status === 'pending';

  // Files taken out of the form after an attempt: their uploads are removed.
  const { keepOnly } = uploads;
  useEffect(() => {
    keepOnly(files.flatMap((item) => (item.prepared ? [item.prepared.key] : [])));
  }, [files, keepOnly]);

  const filesChanged =
    files.length !== card.files.length || files.some((item, index) => item.existing?.id !== card.files[index]?.id);
  const changed =
    neededTopic.trim() !== card.neededTopic ||
    offeredTopic.trim() !== card.offeredTopic ||
    active !== (card.status === 'active') ||
    filesChanged;
  const valid = neededTopic.trim().length > 0 && offeredTopic.trim().length > 0;

  const save = async () => {
    const needed = neededTopic.trim();
    const offered = offeredTopic.trim();
    const prepared = files.flatMap((item) => (item.prepared ? [item.prepared] : []));
    const kept = new Set(files.flatMap((item) => (item.existing ? [item.existing.id] : [])));
    const removeFiles = card.files.filter((file) => !kept.has(file.id)).map((file) => file.id);
    const textChanged = needed !== card.neededTopic || offered !== card.offeredTopic;

    let outcome: SaveOutcome = 'saved';
    if (textChanged || prepared.length > 0 || removeFiles.length > 0) {
      let uploaded: UploadedFile[] = [];
      if (prepared.length > 0) {
        setPhase('uploading');
        try {
          uploaded = await uploads.upload(userId, prepared);
        } catch (err: unknown) {
          console.error('Could not upload card files:', err);
          throw new NoticeError('files', t.files.uploadError);
        }
      }
      // Only new texts and new files are checked; removing a file needs no check.
      setPhase(textChanged || prepared.length > 0 ? 'checking' : 'idle');
      const answer = await editCard(card.id, { neededTopic: needed, offeredTopic: offered, files: uploaded, removeFiles });
      if (answer.result === 'rejected') {
        const fileKey = answer.field === 'file' && answer.file !== null ? (prepared[answer.file]?.key ?? null) : null;
        setRejection({ category: answer.category, field: answer.field, fileKey });
        setRejectCount((count) => count + 1);
        playSound('error');
        return;
      }
      if (answer.result === 'limited') throw new NoticeError('limit', t.moderation.limited(answer.retryAfter));
      if (answer.result === 'error') throw new Error(t.moderation.errors[answer.error]);
      uploads.settle();
      if (answer.result === 'pending') outcome = 'pending';
    }
    setPhase('idle');
    // A card waiting for the moderator cannot be switched on or off.
    if (outcome === 'saved' && !pending && active !== (card.status === 'active')) {
      await setMyCardStatus(card.id, active ? 'active' : 'archived');
    }
    await onSaved(outcome);
  };

  const run = async (kind: 'save' | 'delete') => {
    setBusy(kind);
    setError(null);
    setRejection(null);
    try {
      if (kind === 'save') await save();
      else await onDelete(card);
    } catch (err: unknown) {
      setError(
        err instanceof NoticeError
          ? { kind: err.kind, text: err.message }
          : { kind: 'error', text: err instanceof Error ? err.message : t.common.somethingWrong },
      );
    } finally {
      setBusy(null);
      setPhase('idle');
    }
  };

  const flaggedNumber =
    rejection?.fileKey != null ? files.findIndex((item) => item.key === rejection.fileKey) + 1 || null : null;
  const fix = fixHint(rejection, flaggedNumber);

  return (
    <div className="flex flex-col gap-4 px-6 pt-2 pb-10">
      <div className="flex gap-2">
        <SubjectLine label={t.profile.needs} card={card} side="needed" />
        <SubjectLine label={t.profile.teaches} card={card} side="offered" />
      </div>
      <p className="-mt-2 text-xs font-medium text-muted">{t.manage.subjectsFixed}</p>

      {/* key: the flagged field shakes again on every rejection. Scanner line during the check. */}
      <div key={`fields-${rejectCount}`} className="relative -mx-2 flex flex-col gap-4 rounded-2xl px-2 py-1">
        <div data-check-field="needed">
        <TopicInput
          label={t.create.neededTopics}
          value={neededTopic}
          onChange={(value) => {
            setNeededTopic(value);
            if (rejection?.field === 'needed') setRejection(null);
          }}
          error={rejection?.field === 'needed' ? t.moderation.fix.needed : null}
        />
        </div>
        <div data-check-field="file">
        <AttachmentsField
          items={files}
          onChange={(items) => {
            setFiles(items);
            if (rejection?.fileKey && !items.some((item) => item.key === rejection.fileKey)) setRejection(null);
          }}
          disabled={busy !== null}
          flagged={rejection?.fileKey && fix ? { key: rejection.fileKey, message: fix, shakeKey: rejectCount } : null}
        />
        </div>
        <div data-check-field="offered">
        <TopicInput
          label={t.manage.offeredTopics}
          value={offeredTopic}
          onChange={(value) => {
            setOfferedTopic(value);
            if (rejection?.field === 'offered') setRejection(null);
          }}
          error={rejection?.field === 'offered' ? t.moderation.fix.offered : null}
        />
        </div>
        <ScanOverlay active={phase === 'checking'} />
      </div>

      {/* Active ⇄ inactive; a card waiting for the moderator has no switch. */}
      {pending ? (
        <div className="flex items-center gap-3 rounded-2xl bg-soft px-4 py-3">
          <Clock aria-hidden className="size-5 shrink-0 text-warning" strokeWidth={2.4} />
          <div className="flex flex-col">
            <span className="text-[15px] font-bold text-ink">{t.profile.status.pending}</span>
            <span className="text-xs font-medium text-muted">{t.moderation.pendingHint}</span>
          </div>
        </div>
      ) : (
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-soft px-4 py-3">
        <div className="flex flex-col">
          <span className="text-[15px] font-bold text-ink">{active ? t.profile.status.active : t.profile.status.archived}</span>
          <span className="text-xs font-medium text-muted">
            {active ? t.manage.activeHint : t.manage.inactiveHint}
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={active}
          aria-label={t.manage.activeSwitch}
          onClick={() => setActive((value) => !value)}
          className={`relative h-8 w-14 shrink-0 cursor-pointer rounded-full transition-colors duration-300 ${
            active ? 'bg-linear-to-r from-brand-from to-brand-to' : 'bg-line-strong'
          }`}
        >
          <span
            className={`absolute top-1 left-1 size-6 rounded-full bg-surface shadow-[0_2px_6px_rgba(27,21,48,0.2)] transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
              active ? 'translate-x-6' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
      )}

      {rejection && <RejectionNotice key={rejectCount} rejection={rejection} fix={fix} edit />}

      {error && <ErrorNotice key={error.text} kind={error.kind} text={error.text} />}

      <button
        type="button"
        onClick={() => run('save')}
        disabled={!changed || !valid || busy !== null}
        aria-busy={phase !== 'idle'}
        className={`flex h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl text-base font-bold text-white shadow-[0_8px_20px_rgba(200,40,140,0.28)] transition active:scale-[0.98] disabled:cursor-default ${
          phase === 'checking' ? 'ai-checking' : 'bg-linear-to-r from-brand-fill-from to-brand-fill-to'
        } ${busy === 'save' ? '' : 'disabled:opacity-50'}`}
      >
        {phase !== 'idle' ? (
          <CheckingLabel phase={phase} />
        ) : (
          <>
            {busy === 'save' && <Loader2 className="size-5 animate-spin" />}
            {t.manage.save}
          </>
        )}
      </button>

      {/* Delete, with a second step */}
      <div>
        {confirmDelete ? (
          <div className="flex animate-pop flex-col gap-3 rounded-2xl border border-danger-line bg-danger-soft p-4 motion-reduce:animate-none">
            <p className="text-sm font-bold text-danger-ink">{t.manage.deleteConfirm}</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={busy !== null}
                className="h-12 cursor-pointer rounded-xl border border-line-strong bg-surface text-sm font-bold text-ink transition active:scale-[0.98]"
              >
                {t.manage.keep}
              </button>
              <button
                type="button"
                onClick={() => run('delete')}
                disabled={busy !== null}
                className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#C0264B] text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
              >
                {busy === 'delete' ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                {t.manage.delete}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-danger-line bg-surface text-sm font-bold text-danger-ink transition hover:bg-danger-soft active:scale-[0.98]"
          >
            <Trash2 className="size-4" />
            {t.manage.deleteCard}
          </button>
        )}
      </div>
    </div>
  );
}
