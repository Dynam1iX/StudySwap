'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SUBJECTS } from '@/lib/types';
import { SubjectBadge } from '@/components/SubjectBadge';
import { ArrowLeftRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CreatePostPage() {
  const router = useRouter();
  const [neededId, setNeededId] = useState<number>(9); // CAL 1
  const [offeredId, setOfferedId] = useState<number>(1); // ITP 1
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const neededSubject = SUBJECTS.find((s) => s.id === neededId)!;
  const offeredSubject = SUBJECTS.find((s) => s.id === offeredId)!;

  // Реальная операция WRITE в таблицу barter_posts
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (neededId === offeredId) {
      setError('Предмет, с которым нужна помощь, не может совпадать с преподаваемым.');
      return;
    }

    if (!description.trim()) {
      setError('Укажите краткое описание условий обмена.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Записываем пост от лица твоего профиля Alzhan Yerzhanuly
      const { error: insertError } = await supabase.from('barter_posts').insert([
        {
          author_id: '11111111-1111-1111-1111-111111111111',
          needed_subject_id: neededId,
          offered_subject_id: offeredId,
          description: description.trim(),
          status: 'active'
        }
      ]);

      if (insertError) {
        throw insertError;
      }

      setIsSuccess(true);
      setTimeout(() => {
        router.push('/');
      }, 1200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Не удалось сохранить запись в Supabase';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <header className="pt-2">
        <h1 className="text-xl font-extrabold tracking-tight text-white">Новое предложение</h1>
        <p className="text-xs text-zinc-400 mt-0.5">Опубликуйте запрос для быстрого поиска напарника</p>
      </header>

      <div className="p-3.5 rounded-2xl bg-zinc-950 border border-indigo-500/30 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">Предпросмотр в ленте</span>
          <span className="text-[10px] text-zinc-500">Только что</span>
        </div>

        <div className="flex items-center justify-between gap-2 p-2 bg-zinc-900/60 rounded-xl border border-zinc-800">
          <div>
            <span className="text-[9px] uppercase font-bold text-zinc-500 block mb-0.5">Нужна помощь</span>
            <SubjectBadge code={neededSubject.code} category={neededSubject.category} size="sm" />
          </div>
          <ArrowLeftRight className="w-3.5 h-3.5 text-zinc-600" />
          <div className="text-right">
            <span className="text-[9px] uppercase font-bold text-zinc-500 block mb-0.5">Обучу взамен</span>
            <SubjectBadge code={offeredSubject.code} category={offeredSubject.category} size="sm" />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-center gap-2 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isSuccess && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-2 text-emerald-300 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Успешно сохранено в базе данных! Перенаправление...</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Предмет, с которым нужна помощь *</label>
          <select
            value={neededId}
            onChange={(e) => setNeededId(Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 transition"
          >
            {SUBJECTS.map((s) => (
              <option key={s.id} value={s.id}>
                [{s.category}] {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Предмет, которому можете обучить *</label>
          <select
            value={offeredId}
            onChange={(e) => setOfferedId(Number(e.target.value))}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 transition"
          >
            {SUBJECTS.map((s) => (
              <option key={s.id} value={s.id}>
                [{s.category}] {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-xs font-semibold text-zinc-300">Описание условий обмена *</label>
            <span className="text-[10px] text-zinc-500">{description.length}/200</span>
          </div>
          <textarea
            maxLength={200}
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Опишите, в чем именно трудность и когда удобно созвониться..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition duration-150 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Сохранение в базу...
            </>
          ) : (
            'Опубликовать карточку бартера'
          )}
        </button>
      </form>
    </div>
  );
}