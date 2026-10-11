'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export type Category = 'CS & Dev' | 'Mathematics' | 'Humanities' | 'Languages';

interface SubjectItem {
  id: number;
  code: string;
  name: string;
  category: Category;
  department: string;
}

const PALETTES: Record<Category, { bg: string; label: string; title: string; topic: string; dot: string }> = {
  'CS & Dev': {
    bg: '#D9E1F1',
    label: '#274CB1',
    title: '#1E3A8A',
    topic: '#4065BB',
    dot: '#4065BB',
  },
  'Languages': {
    bg: '#FDD5DA',
    label: '#9E1842',
    title: '#881337',
    topic: '#BE1F52',
    dot: '#9E1842',
  },
  'Humanities': {
    bg: '#FDEAE2',
    label: '#994716',
    title: '#78350F',
    topic: '#C35F20',
    dot: '#994716',
  },
  'Mathematics': {
    bg: '#CBC2F7',
    label: '#5B24B1',
    title: '#4C1D95',
    topic: '#6D2ED6',
    dot: '#6D2ED6',
  },
};

export default function CreateBarterPage() {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Выбор дисциплин
  const [neededSubjectId, setNeededSubjectId] = useState<number | null>(null);
  const [offeredSubjectId, setOfferedSubjectId] = useState<number | null>(null);

  // Два раздельных поля для топиков
  const [neededDetails, setNeededDetails] = useState('');
  const [offeredDetails, setOfferedDetails] = useState('');

  // Способ связи
  const [contactMethod, setContactMethod] = useState<'telegram' | 'email'>('email');

  // Валидация
  const [errors, setErrors] = useState<{
    needed?: boolean;
    offered?: boolean;
    neededDetails?: boolean;
    offeredDetails?: boolean;
    sameSubject?: boolean;
  }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [shakeTrigger, setShakeTrigger] = useState<number>(0);

  // Данные автора
  const [authorId, setAuthorId] = useState<string>('');
  const [authorName, setAuthorName] = useState<string>('Alzhan Y.');
  const [authorSubtitle, setAuthorSubtitle] = useState<string>('Software Engineering, Year 1');

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [subRes, userRes] = await Promise.all([
          supabase.from('subjects').select('*').order('name', { ascending: true }),
          supabase
            .from('users')
            .select('id, full_name, major, study_year')
            .eq('email', 'a.yerzhanuly@astanait.edu.kz')
            .maybeSingle(),
        ]);

        if (subRes.data) {
          setSubjects(subRes.data as SubjectItem[]);
        }

        let activeUser = userRes.data;
        if (!activeUser) {
          const { data: fallbackUser } = await supabase
            .from('users')
            .select('id, full_name, major, study_year')
            .limit(1)
            .maybeSingle();
          activeUser = fallbackUser;
        }

        if (activeUser) {
          setAuthorId(activeUser.id);
          const parts = activeUser.full_name.trim().split(' ');
          setAuthorName(parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : activeUser.full_name);
          setAuthorSubtitle(`${activeUser.major || 'Software Engineering'}, Year ${activeUser.study_year || 1}`);
        }
      } catch (err) {
        console.error('Initial data load error:', err);
      } finally {
        setLoadingSubjects(false);
      }
    }
    loadInitialData();
  }, []);

  const neededSubject = subjects.find((s) => s.id === neededSubjectId);
  const offeredSubject = subjects.find((s) => s.id === offeredSubjectId);

  const neededPal = (neededSubject && PALETTES[neededSubject.category]) || PALETTES['Mathematics'];
  const offeredPal = (offeredSubject && PALETTES[offeredSubject.category]) || PALETTES['CS & Dev'];

  const handleSubmit = async () => {
    setServerError(null);
    const newErrors: typeof errors = {};

    if (!neededSubjectId) newErrors.needed = true;
    if (!offeredSubjectId) newErrors.offered = true;

    if (neededSubjectId && offeredSubjectId && neededSubjectId === offeredSubjectId) {
      newErrors.sameSubject = true;
      newErrors.needed = true;
      newErrors.offered = true;
    }

    if (!neededDetails.trim()) {
      newErrors.neededDetails = true;
    }

    if (!offeredDetails.trim()) {
      newErrors.offeredDetails = true;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setShakeTrigger((prev) => prev + 1);
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('barter_posts').insert([
        {
          author_id: authorId,
          needed_subject_id: neededSubjectId,
          offered_subject_id: offeredSubjectId,
          description: neededDetails.trim(),
          offered_description: offeredDetails.trim(),
          contact_method: contactMethod,
          status: 'active',
        },
      ]);

      if (error) {
        setServerError(`Database error: ${error.message}`);
        setShakeTrigger((prev) => prev + 1);
      } else {
        window.location.href = '/';
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown network error';
      setServerError(msg);
      setShakeTrigger((prev) => prev + 1);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: 576,
        width: '100%',
        margin: '0 auto',
        minHeight: '100vh',
        backgroundColor: '#FBF9FF',
        position: 'relative',
        paddingBottom: 110,
        fontFamily: "'Montserrat', sans-serif",
      }}
    >
      <style>{`
        @keyframes errorShake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .shake-animation {
          animation: errorShake 0.35s ease-in-out;
        }
      `}</style>

      {/* 1. Логотип */}
      <header className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src="/StudySwapLogo.svg"
            alt="StudySwap"
            style={{ width: 36, height: 36, borderRadius: 12 }}
          />
          <h1
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: 24,
              fontWeight: 700,
              color: '#1B1530',
              lineHeight: '29px',
            }}
          >
            StudySwap
          </h1>
        </div>
      </header>

      {/* 2. Навигация */}
      <div className="px-4 py-2 flex items-center justify-between relative z-20">
        <a
          href="/"
          className="flex items-center gap-1.5 text-[#1B1530] text-[15px] font-semibold hover:opacity-70 transition cursor-pointer select-none py-1.5 px-2 -ml-2 rounded-lg active:scale-95 no-underline"
        >
          <span style={{ fontSize: 22, lineHeight: '1', fontWeight: 700 }}>‹</span>
          <span>Back</span>
        </a>

        <h2
          style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: '-0.18px',
            color: '#1B1530',
          }}
        >
          Create Barter Offer
        </h2>

        <a
          href="/"
          className="text-[#5A5472] text-[15px] font-semibold hover:text-[#1B1530] transition cursor-pointer select-none py-1.5 px-2 -mr-2 rounded-lg active:scale-95 no-underline"
        >
          Cancel
        </a>
      </div>

      {/* 3. Подзаголовок */}
      <div className="px-4 py-2">
        <p className="text-[14px] leading-[21px] font-semibold text-[#5A5472]">
          Exchange your academic strengths to get help with challenging subjects.
        </p>
      </div>

      {serverError && (
        <div 
          key={`err-${shakeTrigger}`}
          className="mx-4 mb-2 p-3 bg-red-50 border border-red-300 rounded-xl text-red-700 text-xs font-semibold shake-animation"
        >
          {serverError}
        </div>
      )}

      {/* 4. Форма создания */}
      <div className="px-4 py-2">
        <div className="bg-white border border-[#ECE6F7] rounded-[24px] p-4 shadow-sm space-y-4">
          
          {/* Поле 1: Subject you need help with */}
          <div
            key={`needed-${shakeTrigger}`}
            className={`space-y-1.5 transition ${errors.needed ? 'shake-animation' : ''}`}
          >
            <label className="block text-[14px] font-bold text-[#1B1530]">
              Subject you need help with <span className="text-[#AD46FF]">*</span>
            </label>
            <div className="relative">
              <select
                value={neededSubjectId ?? ''}
                onChange={(e) => {
                  setNeededSubjectId(e.target.value ? Number(e.target.value) : null);
                  setErrors((prev) => ({ ...prev, needed: false, sameSubject: false }));
                  setServerError(null);
                }}
                className={`w-full h-[44px] pl-8 pr-12 rounded-[14px] border bg-white text-[15px] font-semibold outline-none appearance-none cursor-pointer transition ${
                  errors.needed
                    ? 'border-[#E02424] ring-2 ring-red-100 text-[#1B1530]'
                    : neededSubjectId
                      ? 'border-[#0E9F6E] text-[#1B1530]'
                      : 'border-[#CFC6E6] text-[#6F6888]'
                }`}
              >
                <option value="" disabled>Select a subject...</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id} className="text-[#1B1530]">
                    {sub.name} ({sub.code})
                  </option>
                ))}
              </select>

              <span
                style={{ backgroundColor: neededSubject ? neededPal.dot : '#A09BB5' }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full pointer-events-none"
              />

              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                {neededSubjectId && !errors.needed && (
                  <div className="w-5 h-5 rounded-full bg-[#DDF4E8] flex items-center justify-center text-[#0B6B48] text-xs font-bold">
                    ✓
                  </div>
                )}
                <span className="text-[#5A5472] text-xs">▼</span>
              </div>
            </div>

            {errors.needed && (
              <p className="text-[12px] font-semibold text-[#E02424]">
                {errors.sameSubject ? 'Subjects cannot be identical' : 'Please select a subject you need help with'}
              </p>
            )}
            {!errors.needed && neededSubjectId && (
              <p className="text-[13px] font-semibold text-[#0B6B48]">Subject selected</p>
            )}
          </div>

          {/* Поле 2: Topics you need help with */}
          <div
            key={`needed-desc-${shakeTrigger}`}
            className={`space-y-1.5 pt-1 transition ${errors.neededDetails ? 'shake-animation' : ''}`}
          >
            <label className="block text-[14px] font-bold text-[#1B1530]">
              Topics you need help with <span className="text-xs font-semibold text-[#AD46FF]">*</span>
            </label>
            <div className="relative">
              <textarea
                value={neededDetails}
                onChange={(e) => {
                  setNeededDetails(e.target.value.slice(0, 150));
                  if (errors.neededDetails && e.target.value.trim()) {
                    setErrors((prev) => ({ ...prev, neededDetails: false }));
                  }
                  setServerError(null);
                }}
                placeholder="e.g., Struggling with RREF, limits, calculus exam questions..."
                rows={2}
                className={`w-full p-3 pb-7 rounded-[14px] border text-[14px] font-semibold text-[#1B1530] placeholder-[#6F6888] outline-none resize-none leading-relaxed transition ${
                  errors.neededDetails
                    ? 'border-[#E02424] ring-2 ring-red-100'
                    : 'border-[#CFC6E6] focus:border-[#AD46FF]'
                }`}
              />
              <span className="absolute right-3 bottom-2 text-[12px] font-semibold text-[#5A5472] select-none">
                {neededDetails.length} / 150
              </span>
            </div>
            {errors.neededDetails && (
              <p className="text-[12px] font-semibold text-[#E02424]">
                Please describe what topics you need assistance with
              </p>
            )}
          </div>

          {/* Поле 3: Subject you can teach */}
          <div
            key={`offered-${shakeTrigger}`}
            className={`space-y-1.5 pt-1 transition ${errors.offered ? 'shake-animation' : ''}`}
          >
            <label className="block text-[14px] font-bold text-[#1B1530]">
              Subject you can teach <span className="text-[#AD46FF]">*</span>
            </label>
            <div className="relative">
              <select
                value={offeredSubjectId ?? ''}
                onChange={(e) => {
                  setOfferedSubjectId(e.target.value ? Number(e.target.value) : null);
                  setErrors((prev) => ({ ...prev, offered: false, sameSubject: false }));
                  setServerError(null);
                }}
                className={`w-full h-[44px] pl-8 pr-12 rounded-[14px] border bg-white text-[15px] font-semibold outline-none appearance-none cursor-pointer transition ${
                  errors.offered
                    ? 'border-[#E02424] ring-2 ring-red-100 text-[#1B1530]'
                    : offeredSubjectId
                      ? 'border-[#0E9F6E] text-[#1B1530]'
                      : 'border-[#CFC6E6] text-[#6F6888]'
                }`}
              >
                <option value="" disabled>Select a subject...</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id} className="text-[#1B1530]">
                    {sub.name} ({sub.code})
                  </option>
                ))}
              </select>

              <span
                style={{ backgroundColor: offeredSubject ? offeredPal.dot : '#A09BB5' }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full pointer-events-none"
              />

              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                {offeredSubjectId && !errors.offered && (
                  <div className="w-5 h-5 rounded-full bg-[#DDF4E8] flex items-center justify-center text-[#0B6B48] text-xs font-bold">
                    ✓
                  </div>
                )}
                <span className="text-[#5A5472] text-xs">▼</span>
              </div>
            </div>

            {errors.offered && (
              <p className="text-[12px] font-semibold text-[#E02424]">
                {errors.sameSubject ? 'Subjects cannot be identical' : 'Please select a subject you can teach'}
              </p>
            )}
            {!errors.offered && offeredSubjectId && (
              <p className="text-[13px] font-semibold text-[#0B6B48]">Subject selected</p>
            )}
          </div>

          {/* Поле 4: Topics you can teach */}
          <div
            key={`offered-desc-${shakeTrigger}`}
            className={`space-y-1.5 pt-1 transition ${errors.offeredDetails ? 'shake-animation' : ''}`}
          >
            <label className="block text-[14px] font-bold text-[#1B1530]">
              Topics you can teach / explain <span className="text-xs font-semibold text-[#AD46FF]">*</span>
            </label>
            <div className="relative">
              <textarea
                value={offeredDetails}
                onChange={(e) => {
                  setOfferedDetails(e.target.value.slice(0, 150));
                  if (errors.offeredDetails && e.target.value.trim()) {
                    setErrors((prev) => ({ ...prev, offeredDetails: false }));
                  }
                  setServerError(null);
                }}
                placeholder="e.g., Can explain pointers, OOP principles, binary trees and labs..."
                rows={2}
                className={`w-full p-3 pb-7 rounded-[14px] border text-[14px] font-semibold text-[#1B1530] placeholder-[#6F6888] outline-none resize-none leading-relaxed transition ${
                  errors.offeredDetails
                    ? 'border-[#E02424] ring-2 ring-red-100'
                    : 'border-[#CFC6E6] focus:border-[#AD46FF]'
                }`}
              />
              <span className="absolute right-3 bottom-2 text-[12px] font-semibold text-[#5A5472] select-none">
                {offeredDetails.length} / 150
              </span>
            </div>
            {errors.offeredDetails && (
              <p className="text-[12px] font-semibold text-[#E02424]">
                Please describe what topics you can explain in return
              </p>
            )}
          </div>

          {/* Поле 5: Preferred Contact Method */}
          <div className="space-y-2 pt-1">
            <label className="block text-[14px] font-bold text-[#1B1530]">
              Preferred Contact Method
            </label>
            <div className="p-1 bg-[#F4F0FB] rounded-[16px] flex items-center gap-1">
              <button
                type="button"
                onClick={() => setContactMethod('telegram')}
                style={{
                  backgroundColor: contactMethod === 'telegram' ? '#FFFFFF' : 'transparent',
                  boxShadow: contactMethod === 'telegram' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                }}
                className="flex-1 h-[48px] rounded-[12px] flex items-center px-3 gap-2 transition cursor-pointer"
              >
                <div
                  className={`w-[18px] h-[18px] rounded-full flex items-center justify-center border ${
                    contactMethod === 'telegram' ? 'border-[#AD46FF]' : 'border-[#8F88A8]'
                  }`}
                >
                  {contactMethod === 'telegram' && (
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#AD46FF] to-[#F6339A]" />
                  )}
                </div>
                <span
                  className={`text-[13px] ${
                    contactMethod === 'telegram'
                      ? 'font-bold text-[#1B1530]'
                      : 'font-semibold text-[#5A5472]'
                  }`}
                >
                  Telegram
                </span>
              </button>

              <button
                type="button"
                onClick={() => setContactMethod('email')}
                style={{
                  backgroundColor: contactMethod === 'email' ? '#FFFFFF' : 'transparent',
                  boxShadow: contactMethod === 'email' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                }}
                className="flex-1 h-[48px] rounded-[12px] flex items-center px-3 gap-2 transition cursor-pointer"
              >
                <div
                  className={`w-[18px] h-[18px] rounded-full flex items-center justify-center border ${
                    contactMethod === 'email' ? 'border-[#AD46FF]' : 'border-[#8F88A8]'
                  }`}
                >
                  {contactMethod === 'email' && (
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#AD46FF] to-[#F6339A]" />
                  )}
                </div>
                <span
                  className={`text-[13px] ${
                    contactMethod === 'email'
                      ? 'font-bold text-[#1B1530]'
                      : 'font-semibold text-[#5A5472]'
                  }`}
                >
                  University Email
                </span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* 5. Живой превью блок */}
      <div className="px-4 pt-4 pb-2">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.88px] text-[#5A5472] mb-2.5">
          PREVIEW IN FEED
        </h3>

        <div className="bg-white border border-[#ECE6F7] rounded-2xl p-4 shadow-sm space-y-2.5 w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-[#F1E9FF] text-[#6D1FC4] text-xs font-semibold flex items-center justify-center shrink-0">
                AY
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-[15px] font-semibold text-[#1B1530]">{authorName}</span>
                <span className="text-[13px] font-medium text-[#5A5472]">{authorSubtitle}</span>
              </div>
            </div>

            <button type="button" aria-label="Wishlist heart" className="p-1 text-[#1B1530]">
              <img src="/like.svg" alt="Like" style={{ width: 22, height: 22 }} />
            </button>
          </div>

          <div className="relative flex flex-col gap-2 w-full">
            {/* NEEDS HELP: выводит neededDetails */}
            <div
              style={{ backgroundColor: neededSubject ? neededPal.bg : '#F3EFFC' }}
              className="rounded-xl p-3 flex flex-col min-h-[83px] justify-between w-full"
            >
              <span
                style={{ color: neededSubject ? neededPal.label : '#736A8E' }}
                className="text-[10px] font-semibold uppercase tracking-wider block"
              >
                NEEDS HELP
              </span>
              <span
                style={{ color: neededSubject ? neededPal.title : '#2F274B' }}
                className="text-[18px] font-semibold truncate leading-tight block pr-8"
              >
                {neededSubject?.name || 'Select subject...'}
              </span>
              <span
                style={{ color: neededSubject ? neededPal.topic : '#5A5472' }}
                className="text-[12px] font-medium truncate block"
              >
                {neededDetails.trim() ? neededDetails : (neededSubject ? neededSubject.code : 'Topics you need help with...')}
              </span>
            </div>

            {/* CAN TEACH: выводит offeredDetails */}
            <div
              style={{ backgroundColor: offeredSubject ? offeredPal.bg : '#F3EFFC' }}
              className="rounded-xl p-3 flex flex-col min-h-[83px] justify-between w-full"
            >
              <span
                style={{ color: offeredSubject ? offeredPal.label : '#736A8E' }}
                className="text-[10px] font-semibold uppercase tracking-wider block"
              >
                CAN TEACH
              </span>
              <span
                style={{ color: offeredSubject ? offeredPal.title : '#2F274B' }}
                className="text-[18px] font-semibold truncate leading-tight block pr-8"
              >
                {offeredSubject?.name || 'Select subject...'}
              </span>
              <span
                style={{ color: offeredSubject ? offeredPal.topic : '#5A5472' }}
                className="text-[12px] font-medium truncate block"
              >
                {offeredDetails.trim() ? offeredDetails : (offeredSubject ? offeredSubject.code : 'Topics you can teach...')}
              </span>
            </div>

            <div
              style={{
                position: 'absolute',
                right: 18,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 40,
                height: 40,
                zIndex: 10,
                pointerEvents: 'none',
                filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.12))'
              }}
            >
              <img
                src="/exchangeicon.svg"
                alt="Exchange"
                style={{ width: 40, height: 40, display: 'block' }}
              />
            </div>
          </div>

          <div
            style={{
              width: '100%',
              height: 48,
              borderRadius: 12,
              background: 'linear-gradient(90deg, #AD46FF 0%, #F6339A 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              color: '#FFFFFF',
              fontWeight: 600,
              fontSize: 15,
            }}
            className="select-none opacity-95"
          >
            {contactMethod === 'telegram' ? (
              <>
                <img src="/telegram.svg" alt="Telegram" style={{ width: 22, height: 22 }} />
                <span>Message on Telegram</span>
              </>
            ) : (
              <>
                <img src="/email.svg" alt="Email" style={{ width: 22, height: 22 }} />
                <span>Send an Email</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-2">
        <div className="bg-[#F3E8FF] rounded-[16px] p-4 flex items-center gap-3">
          <span style={{ fontSize: 18 }}>🔒</span>
          <p className="text-[13px] leading-[19px] font-semibold text-[#3B2A66]">
            Contact details are only shared with verified university students.
          </p>
        </div>
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 576,
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid #ECE6F7',
          padding: '12px 16px 20px',
          zIndex: 50,
        }}
      >
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || loadingSubjects}
          style={{
            background: 'linear-gradient(90deg, #AD46FF 0%, #F6339A 100%)',
            boxShadow: '0px 8px 20px rgba(200, 40, 140, 0.28)',
          }}
          className="w-full h-[56px] rounded-[16px] text-white text-[17px] font-bold flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.99] transition disabled:opacity-50 cursor-pointer"
        >
          {submitting ? 'Publishing offer...' : 'Publish Barter Offer'}
        </button>
      </div>
    </div>
  );
}