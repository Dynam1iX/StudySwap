'use client';

import { useId, useRef, useState } from 'react';
import { FileText, ImagePlus, Loader2, X } from 'lucide-react';
import {
  FILE_ACCEPT,
  MAX_CARD_FILES,
  prepareCardFile,
  useCardFileUrls,
  type CardFile,
  type PreparedFile,
} from '@/lib/cardFiles';
import { playSound } from '@/lib/sound';
import { useT } from '@/i18n';

/** A file in the form: already on the card, or picked now and not uploaded yet. */
export type AttachmentItem =
  | { key: string; existing: CardFile; prepared?: undefined }
  | { key: string; prepared: PreparedFile; existing?: undefined };

export function itemsFromFiles(files: CardFile[]): AttachmentItem[] {
  return files.map((file) => ({ key: file.id, existing: file }));
}

/**
 * "Examples of tasks": up to 3 photos or PDFs. Photos are compressed on the device as
 * soon as they are picked, so the thumbnail is exactly what will be uploaded.
 */
export function AttachmentsField({
  items,
  onChange,
  disabled = false,
  flagged = null,
}: {
  items: AttachmentItem[];
  onChange: (items: AttachmentItem[]) => void;
  disabled?: boolean;
  /** A file the AI check objected to: outlined in red, with the fix under the grid. */
  flagged?: { key: string; message: string; shakeKey: number } | null;
}) {
  const t = useT();
  const inputId = useId();
  const hintId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preparing, setPreparing] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const urls = useCardFileUrls(items.flatMap((item) => (item.existing ? [item.existing.path] : [])));
  const free = MAX_CARD_FILES - items.length - preparing;

  const pick = async (list: FileList | null) => {
    const picked = [...(list ?? [])];
    if (inputRef.current) inputRef.current.value = '';
    if (picked.length === 0) return;
    setError(null);
    const taken = picked.slice(0, Math.max(0, free));
    if (picked.length > taken.length) setError(t.files.tooMany);
    if (taken.length === 0) return;

    setPreparing((n) => n + taken.length);
    const ready: AttachmentItem[] = [];
    for (const file of taken) {
      try {
        const prepared = await prepareCardFile(file);
        ready.push({ key: prepared.key, prepared });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : t.common.somethingWrong);
        playSound('error');
      } finally {
        setPreparing((n) => n - 1);
      }
    }
    if (ready.length > 0) onChange([...items, ...ready]);
  };

  const remove = (item: AttachmentItem) => {
    if (item.prepared?.previewUrl) URL.revokeObjectURL(item.prepared.previewUrl);
    setError(null);
    onChange(items.filter((other) => other.key !== item.key));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={inputId} className="text-[14px] font-bold text-ink">
          {t.files.title} <span className="font-semibold text-muted">· {t.files.optional}</span>
        </label>
        <span className="text-[12px] font-semibold text-muted tabular-nums">
          {items.length} / {MAX_CARD_FILES}
        </span>
      </div>
      <p id={hintId} className="-mt-1 text-xs font-medium text-muted">
        {t.files.hint}
      </p>

      <ul className="grid grid-cols-3 gap-2">
        {items.map((item) => {
          const { kind, name } = item.existing ?? item.prepared;
          const preview = item.existing ? urls[item.existing.path] : item.prepared.previewUrl;
          return (
            <li
              key={flagged?.key === item.key ? `${item.key}-${flagged.shakeKey}` : item.key}
              className={`relative aspect-square rounded-2xl motion-reduce:animate-none ${
                flagged?.key === item.key
                  ? 'animate-wiggle ring-2 ring-danger ring-offset-2 ring-offset-surface'
                  : 'animate-pop'
              }`}
            >
              {kind === 'image' ? (
                <span className="block size-full overflow-hidden rounded-2xl border border-line bg-soft">
                  {preview ? (
                    <img src={preview} alt={name} draggable={false} className="size-full object-cover" />
                  ) : (
                    <span className="block size-full animate-pulse bg-line" />
                  )}
                </span>
              ) : (
                <span className="flex size-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-line bg-soft p-2 text-center">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-[#E5484D] text-white shadow-[0_6px_14px_rgba(229,72,77,0.35)]">
                    <FileText className="size-5" strokeWidth={2.2} />
                  </span>
                  <span className="line-clamp-2 w-full text-[11px] leading-tight font-semibold break-all text-ink">{name}</span>
                </span>
              )}
              <button
                type="button"
                onClick={() => remove(item)}
                disabled={disabled}
                aria-label={t.files.remove(name)}
                className="absolute -top-1.5 -right-1.5 flex size-7 cursor-pointer items-center justify-center rounded-full bg-ink text-surface shadow-md transition hover:scale-110 active:scale-90 disabled:opacity-50"
              >
                <X className="size-4" strokeWidth={2.8} />
              </button>
            </li>
          );
        })}

        {Array.from({ length: preparing }, (_, index) => (
          <li
            key={`preparing-${index}`}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-2xl border border-line bg-soft text-[11px] font-semibold text-muted"
          >
            <Loader2 className="size-5 animate-spin text-brand-from" />
            {t.files.preparing}
          </li>
        ))}

        {free > 0 && (
          <li className="aspect-square">
            <label
              htmlFor={inputId}
              aria-describedby={hintId}
              className={`group flex size-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-line-strong p-2 text-center text-[11px] leading-tight font-bold text-muted transition hover:border-brand-from hover:bg-soft hover:text-brand-ink active:scale-95 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-from ${
                disabled ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-brand-fill-from to-brand-fill-to text-white shadow-[0_6px_14px_rgba(200,40,140,0.28)] transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110 group-hover:-rotate-6">
                <ImagePlus className="size-5" strokeWidth={2.2} />
              </span>
              {t.files.add}
            </label>
          </li>
        )}
      </ul>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={FILE_ACCEPT}
        multiple
        disabled={disabled || free <= 0}
        onChange={(event) => void pick(event.target.files)}
        className="sr-only"
      />

      {error && (
        <p key={error} className="animate-shake text-xs font-semibold text-danger-ink">
          {error}
        </p>
      )}
      {!error && flagged && items.some((item) => item.key === flagged.key) && (
        <p className="text-xs font-semibold text-danger-ink">{flagged.message}</p>
      )}
    </div>
  );
}
