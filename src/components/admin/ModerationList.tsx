'use client';

import { useMemo, useState } from 'react';
import { Loader2, Paperclip, Search, Trash2 } from 'lucide-react';
import { DELETE_REASONS, type AdminCard, type DeleteReason } from '@/lib/admin';
import { paletteFor } from '@/lib/categoryPalette';
import { formatPostedAt } from '@/lib/format';
import { LOCALES, useI18n } from '@/i18n';

/** Cards shown at first and added by "Show more". */
const PAGE = 20;
/** Must match duration-300 on a leaving row. */
const EXIT_MS = 300;

const STATUS_STYLE: Record<AdminCard['status'], string> = {
  active: 'bg-brand-soft text-brand-ink',
  completed: 'bg-soft text-ink',
  archived: 'bg-soft text-muted',
};

interface ModerationListProps {
  cards: AdminCard[];
  /** Deletes on the server; rejects with an Error when it fails. */
  onDelete: (card: AdminCard, reason: DeleteReason) => Promise<void>;
  /** Called after the row's exit animation: drop the card from the list. */
  onRemoved: (id: string) => void;
}

function SubjectLine({ label, name, category, topic }: { label: string; name: string; category: AdminCard['needed_category']; topic: string }) {
  const palette = paletteFor(category);
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-2xl px-3 py-2" style={{ background: palette.bg }}>
      <span className="text-[10px] font-extrabold tracking-wide uppercase" style={{ color: palette.label }}>
        {label}
      </span>
      <span className="truncate text-sm font-bold" style={{ color: palette.title }}>
        {name}
      </span>
      <span className="line-clamp-2 text-xs font-medium break-words" style={{ color: palette.topic }}>
        {topic}
      </span>
    </div>
  );
}

function ModerationRow({
  card,
  leaving,
  onDelete,
}: {
  card: AdminCard;
  leaving: boolean;
  onDelete: ModerationListProps['onDelete'];
}) {
  const { t, language } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState<DeleteReason | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    if (!reason || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onDelete(card, reason);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t.admin.deleteError);
      setBusy(false);
    }
  };

  return (
    <li
      className={`grid transition-[grid-template-rows,opacity,transform] duration-300 ease-out ${
        leaving ? 'grid-rows-[0fr] -translate-x-6 opacity-0' : 'grid-rows-[1fr]'
      }`}
    >
      <div className="min-h-0 overflow-hidden">
        <article className="mb-3 flex flex-col gap-3 rounded-3xl border border-line bg-surface p-3">
          <div className="flex items-start justify-between gap-3 px-1">
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-bold text-ink">{card.author_name}</span>
              <span className="truncate text-xs font-medium text-muted">{card.author_email}</span>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_STYLE[card.status]}`}>
                {t.profile.status[card.status]}
              </span>
              <span className="text-[11px] font-medium text-muted">{formatPostedAt(card.created_at, LOCALES[language])}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <SubjectLine label={t.profile.needs} name={card.needed_name} category={card.needed_category} topic={card.description} />
            <SubjectLine label={t.profile.teaches} name={card.offered_name} category={card.offered_category} topic={card.offered_description} />
          </div>

          {!confirming ? (
            <div className="flex items-center justify-between gap-3 px-1">
              <span className="flex items-center gap-1 text-xs font-medium text-muted">
                {card.file_count > 0 && (
                  <>
                    <Paperclip aria-hidden className="size-3.5" />
                    {t.admin.files(card.file_count)}
                  </>
                )}
              </span>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-danger-line px-3.5 text-sm font-bold text-danger-ink transition hover:bg-danger-soft active:scale-95"
              >
                <Trash2 aria-hidden className="size-4" />
                {t.admin.delete}
              </button>
            </div>
          ) : (
            <div className="flex animate-rise flex-col gap-3 rounded-2xl bg-danger-soft p-3 motion-reduce:animate-none">
              <p id={`reason-${card.id}`} className="text-sm font-bold text-danger-ink">
                {t.admin.deleteTitle}
              </p>
              <div role="radiogroup" aria-labelledby={`reason-${card.id}`} className="flex flex-wrap gap-2">
                {DELETE_REASONS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={reason === key}
                    onClick={() => setReason(key)}
                    className={`h-9 cursor-pointer rounded-full border px-3.5 text-xs font-bold transition active:scale-95 ${
                      reason === key
                        ? 'border-danger-ink bg-danger-ink text-white'
                        : 'border-danger-line bg-surface text-danger-ink hover:border-danger-ink'
                    }`}
                  >
                    {t.admin.reasons[key]}
                  </button>
                ))}
              </div>
              {error && (
                <p role="alert" className="text-xs font-semibold text-danger-ink">
                  {error}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setConfirming(false);
                    setReason(null);
                    setError(null);
                  }}
                  disabled={busy}
                  className="h-11 flex-1 cursor-pointer rounded-xl border border-line-strong bg-surface text-sm font-bold text-ink transition active:scale-95"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="button"
                  onClick={remove}
                  disabled={!reason || busy}
                  className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-danger-ink text-sm font-bold text-white transition active:scale-95 disabled:cursor-default disabled:opacity-50"
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 aria-hidden className="size-4" />}
                  {t.admin.confirmDelete}
                </button>
              </div>
            </div>
          )}
        </article>
      </div>
    </li>
  );
}

/** Every card in the database, newest first, with a search box and Delete (requirement R7). */
export function ModerationList({ cards, onDelete, onRemoved }: ModerationListProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [leaving, setLeaving] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter((card) =>
      [card.needed_name, card.offered_name, card.description, card.offered_description, card.author_name, card.author_email]
        .some((text) => text.toLowerCase().includes(q)),
    );
  }, [cards, query]);
  const shown = filtered.slice(0, limit);

  const remove = async (card: AdminCard, reason: DeleteReason) => {
    await onDelete(card, reason);
    setLeaving((prev) => new Set(prev).add(card.id));
    window.setTimeout(() => {
      onRemoved(card.id);
      setLeaving((prev) => {
        const next = new Set(prev);
        next.delete(card.id);
        return next;
      });
    }, EXIT_MS);
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="font-bricolage text-lg font-extrabold text-ink">{t.admin.moderationTitle}</h2>
        <p className="text-xs font-medium text-muted">{t.admin.moderationHint}</p>
      </div>
      <label className="flex h-12 items-center gap-2.5 rounded-2xl border border-field bg-surface px-4 focus-within:border-brand-from">
        <Search aria-hidden className="size-4.5 shrink-0 text-muted" />
        <span className="sr-only">{t.admin.filterLabel}</span>
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setLimit(PAGE);
          }}
          placeholder={t.admin.filterPlaceholder}
          className="h-full min-w-0 flex-1 bg-transparent text-sm font-medium text-ink outline-none placeholder:text-muted"
        />
        <span className="shrink-0 text-xs font-semibold text-muted tabular-nums">{t.admin.showing(shown.length, filtered.length)}</span>
      </label>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line-strong p-6 text-center text-sm font-medium text-muted">
          {t.admin.empty}
        </p>
      ) : (
        <ul className="flex flex-col">
          {shown.map((card) => (
            <ModerationRow key={card.id} card={card} leaving={leaving.has(card.id)} onDelete={remove} />
          ))}
        </ul>
      )}
      {filtered.length > shown.length && (
        <button
          type="button"
          onClick={() => setLimit((value) => value + PAGE)}
          className="h-12 cursor-pointer rounded-2xl border border-line-strong bg-surface text-sm font-bold text-ink transition hover:bg-soft active:scale-[0.98]"
        >
          {t.admin.showMore}
        </button>
      )}
    </section>
  );
}
