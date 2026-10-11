'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Category } from '@/lib/types';
import { Plus, Loader2 } from 'lucide-react';

interface SubjectItem {
  id: number;
  code: string;
  name: string;
  category: Category;
  department: string;
}

interface PostData {
  id: string;
  description: string;
  offered_description?: string;
  contact_method?: 'telegram' | 'email';
  created_at: string;
  needed: SubjectItem | null;
  offered: SubjectItem | null;
  author: {
    id: string;
    full_name: string;
    email?: string;
    telegram_handle: string;
    role: string;
    major?: string;
    study_year?: number;
  } | null;
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

export default function FeedPage() {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | 'All'>('All');
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [activeTab] = useState<'feed' | 'search' | 'favorite' | 'profile'>('feed');

  const chipsContainerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [postsRes, subjectsRes] = await Promise.all([
        supabase
          .from('barter_posts')
          .select(`
            id,
            description,
            offered_description,
            contact_method,
            created_at,
            needed:subjects!barter_posts_needed_subject_id_fkey(id, code, name, category, department),
            offered:subjects!barter_posts_offered_subject_id_fkey(id, code, name, category, department),
            author:users!barter_posts_author_id_fkey(id, full_name, email, telegram_handle, role, major, study_year)
          `)
          .eq('status', 'active')
          .order('created_at', { ascending: false }),

        supabase
          .from('subjects')
          .select('id, code, name, category, department')
          .order('id', { ascending: true })
      ]);

      if (postsRes.data) setPosts(postsRes.data as unknown as PostData[]);
      if (subjectsRes.data) setSubjects(subjectsRes.data as unknown as SubjectItem[]);
    } catch (err) {
      console.error('Error fetching data from Supabase:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChipsScroll = () => {
    if (!chipsContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = chipsContainerRef.current;
    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll > 0) {
      setScrollProgress(scrollLeft / maxScroll);
    }
  };

  const handleSliderClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current || !chipsContainerRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, clickX / rect.width));
    setScrollProgress(progress);

    const maxScroll = chipsContainerRef.current.scrollWidth - chipsContainerRef.current.clientWidth;
    chipsContainerRef.current.scrollTo({
      left: progress * maxScroll,
      behavior: 'smooth'
    });
  };

  const toggleLike = (postId: string) => {
    setLikedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  const filteredPosts = posts.filter((post) => {
    if (selectedSubjectId === 'All') return true;
    return post.needed?.id === selectedSubjectId || post.offered?.id === selectedSubjectId;
  });

  const getInitials = (name?: string) => {
    if (!name) return 'ST';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
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
        paddingBottom: 96,
        fontFamily: "'Montserrat', sans-serif"
      }}
    >
      {/* 1. Header */}
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
              lineHeight: '29px'
            }}
          >
            StudySwap
          </h1>
        </div>
      </header>

      {/* 2. Subject chips */}
      <div 
        ref={chipsContainerRef}
        onScroll={handleChipsScroll}
        className="flex gap-2 px-4 py-2 overflow-x-auto no-scrollbar items-center scroll-smooth"
      >
        <button
          onClick={() => setSelectedSubjectId('All')}
          style={{
            backgroundColor: selectedSubjectId === 'All' ? '#1B1530' : '#FFFFFF',
            color: selectedSubjectId === 'All' ? '#FFFFFF' : '#1B1530',
            borderColor: '#E2DBF1',
            padding: '9px 16px',
            borderRadius: 25,
            fontSize: 14,
            fontWeight: 700,
            lineHeight: '17px',
          }}
          className="shrink-0 border transition shadow-sm outline-none cursor-pointer"
        >
          All
        </button>

        {subjects.map((sub) => {
          const isActive = selectedSubjectId === sub.id;
          const dotColor = PALETTES[sub.category]?.dot || '#4065BB';

          return (
            <button
              key={sub.id}
              onClick={() => setSelectedSubjectId(sub.id)}
              style={{
                backgroundColor: isActive ? '#1B1530' : '#FFFFFF',
                color: isActive ? '#FFFFFF' : '#1B1530',
                borderColor: '#E2DBF1',
                padding: '9px 16px',
                borderRadius: 25,
                fontSize: 14,
                fontWeight: 700,
                lineHeight: '17px',
              }}
              className="flex items-center gap-1.5 shrink-0 border transition shadow-sm outline-none cursor-pointer"
            >
              <span
                style={{ backgroundColor: dotColor, width: 8, height: 8 }}
                className="rounded-full shrink-0 inline-block"
              />
              {sub.name}
            </button>
          );
        })}
      </div>

      {/* 3. Slider */}
      <div className="px-4 py-1.5">
        <div 
          ref={trackRef}
          onClick={handleSliderClick}
          className="w-full h-[5px] bg-[#DFDFDF] rounded-full relative cursor-pointer"
        >
          <div 
            style={{ 
              background: 'linear-gradient(90deg, #AD46FF 0%, #F6339A 100%)',
              width: 48,
              left: `calc(${scrollProgress * 100}% - ${scrollProgress * 48}px)`
            }}
            className="h-full rounded-full absolute top-0 transition-all duration-75" 
          />
        </div>
      </div>

      {/* 4. Section Title */}
      <div className="px-4 pt-3 pb-1">
        <h2 
          style={{ 
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: 22, 
            fontWeight: 700, 
            color: '#000000',
            lineHeight: '26px'
          }}
        >
          Matches for you
        </h2>
      </div>

      {/* 5. Barter cards */}
      <main className="p-4 space-y-4 w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#5A5472] gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#AD46FF]" />
            <span className="text-xs font-medium">Loading barter offers...</span>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-16 text-[#5A5472] text-xs font-medium bg-white border border-[#ECE6F7] rounded-2xl p-6">
            No barter offers found for this subject
          </div>
        ) : (
          filteredPosts.map((post) => {
            const neededPal = post.needed ? PALETTES[post.needed.category] : PALETTES['Mathematics'];
            const offeredPal = post.offered ? PALETTES[post.offered.category] : PALETTES['CS & Dev'];
            
            const authorName = post.author?.full_name || 'AITU Student';
            const authorMajor = post.author?.major || 'Software Engineering';
            const authorYear = post.author?.study_year ? `, Year ${post.author.study_year}` : ', Year 1';
            const authorSubtitle = `${authorMajor}${authorYear}`;

            const authorHandle = post.author?.telegram_handle || 'dynam1ix';
            const authorEmail = post.author?.email || 'student@astanait.edu.kz';
            const isLiked = likedPosts.has(post.id);
            const isTelegram = post.contact_method === 'telegram';

            return (
              <div
                key={post.id}
                className="bg-white border border-[#ECE6F7] rounded-2xl p-4 shadow-sm space-y-2.5 w-full transition"
              >
                {/* Author profile & Wishlist */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#F1E9FF] text-[#6D1FC4] text-xs font-semibold flex items-center justify-center shrink-0">
                      {getInitials(authorName)}
                    </div>
                    <div className="flex flex-col leading-tight min-w-0">
                      <span className="text-[15px] font-semibold text-[#1B1530] truncate">
                        {authorName}
                      </span>
                      <span className="text-[13px] font-medium text-[#5A5472] truncate">
                        {authorSubtitle}
                      </span>
                    </div>
                  </div>

                  <button 
                    onClick={() => toggleLike(post.id)}
                    aria-label="Wishlist toggle"
                    className="p-1 hover:scale-110 active:scale-95 transition cursor-pointer shrink-0"
                  >
                    <img 
                      src={isLiked ? '/liked.svg' : '/like.svg'} 
                      alt="Like" 
                      style={{ width: 22, height: 22 }} 
                    />
                  </button>
                </div>

                {/* Subjects block with both descriptions */}
                <div className="relative flex flex-col gap-2 w-full">
                  {/* NEEDS HELP */}
                  <div
                    style={{ backgroundColor: neededPal.bg }}
                    className="rounded-xl p-3 flex flex-col min-h-[83px] justify-between w-full"
                  >
                    <span
                      style={{ color: neededPal.label }}
                      className="text-[10px] font-semibold uppercase tracking-wider block"
                    >
                      NEEDS HELP
                    </span>
                    <span
                      style={{ color: neededPal.title }}
                      className="text-[18px] font-semibold truncate leading-tight block pr-8"
                    >
                      {post.needed?.name || 'Calculus I'}
                    </span>
                    {/* Топики для помощи */}
                    <span
                      style={{ color: neededPal.topic }}
                      className="text-[12px] font-medium truncate block"
                    >
                      {post.description || post.needed?.code || 'Details & topics'}
                    </span>
                  </div>

                  {/* CAN TEACH */}
                  <div
                    style={{ backgroundColor: offeredPal.bg }}
                    className="rounded-xl p-3 flex flex-col min-h-[83px] justify-between w-full"
                  >
                    <span
                      style={{ color: offeredPal.label }}
                      className="text-[10px] font-semibold uppercase tracking-wider block"
                    >
                      CAN TEACH
                    </span>
                    <span
                      style={{ color: offeredPal.title }}
                      className="text-[18px] font-semibold truncate leading-tight block pr-8"
                    >
                      {post.offered?.name || 'Introduction to Programming 1'}
                    </span>
                    {/* Топики, которым может обучить автор */}
                    <span
                      style={{ color: offeredPal.topic }}
                      className="text-[12px] font-medium truncate block"
                    >
                      {post.offered_description || post.offered?.department || post.offered?.code || 'Topics & skills'}
                    </span>
                  </div>

                  {/* Exchange icon */}
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

                {/* Contact action button */}
                {isTelegram ? (
                  <a
                    href={`https://t.me/${authorHandle}`}
                    target="_blank"
                    rel="noreferrer"
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
                      textDecoration: 'none',
                      fontWeight: 600,
                      fontSize: 15,
                      boxShadow: '0 3px 12px rgba(173, 70, 255, 0.25)'
                    }}
                    className="hover:opacity-95 active:scale-[0.99] transition w-full"
                  >
                    <img 
                      src="/telegram.svg" 
                      alt="Telegram" 
                      style={{ width: 22, height: 22 }} 
                    />
                    <span>Message on Telegram</span>
                  </a>
                ) : (
                  <a
                    href={`mailto:${authorEmail}?subject=${encodeURIComponent(`StudySwap: ${post.needed?.name || 'Academic Exchange'}`)}&body=${encodeURIComponent(`Hi ${authorName}! I saw your StudySwap offer for ${post.needed?.name || 'this subject'}. I would like to connect!`)}`}
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
                      textDecoration: 'none',
                      fontWeight: 600,
                      fontSize: 15,
                      boxShadow: '0 3px 12px rgba(173, 70, 255, 0.25)'
                    }}
                    className="hover:opacity-95 active:scale-[0.99] transition w-full"
                  >
                    <img 
                      src="/email.svg" 
                      alt="Email" 
                      style={{ width: 22, height: 22 }} 
                    />
                    <span>Send an Email</span>
                  </a>
                )}
              </div>
            );
          })
        )}
      </main>

      {/* 6. Navigation bar */}
      <nav 
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 576,
          height: 76,
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid #ECE6F7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          zIndex: 50,
          padding: '0 12px'
        }}
      >
        <div className="flex flex-col items-center gap-1 w-12 text-center select-none cursor-default">
          <img 
            src="/feedselected.svg" 
            onError={(e) => {
              e.currentTarget.src = '/homeselected.svg';
            }}
            alt="Feed" 
            style={{ width: 22, height: 22 }} 
          />
          <span 
            style={{ 
              fontSize: 11, 
              fontWeight: 600,
              background: 'linear-gradient(90deg, #AD46FF 0%, #F6339A 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Feed
          </span>
        </div>

        <div className="flex flex-col items-center gap-1 w-12 text-center opacity-60 pointer-events-none select-none cursor-not-allowed">
          <img src="/search.svg" alt="Search" style={{ width: 22, height: 22 }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#5A5472' }}>Search</span>
        </div>

        <div style={{ position: 'relative', width: 58, height: 50, display: 'flex', justifyContent: 'center' }}>
          <Link
            href="/create"
            style={{
              position: 'absolute',
              top: -20,
              width: 58,
              height: 58,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #A23BF5 0%, #E5237F 100%)',
              border: '4px solid #FFFFFF',
              boxShadow: '0 8px 20px rgba(200, 40, 140, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF'
            }}
            className="hover:scale-105 active:scale-95 transition cursor-pointer"
            aria-label="Create barter card"
          >
            <Plus style={{ width: 28, height: 28 }} strokeWidth={2.5} />
          </Link>
        </div>

        <div className="flex flex-col items-center gap-1 w-12 text-center opacity-60 pointer-events-none select-none cursor-not-allowed">
          <img 
            src={activeTab === 'favorite' ? '/likeselected.svg' : '/like.svg'} 
            alt="Favorite" 
            style={{ width: 22, height: 22 }} 
          />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#5A5472' }}>Favorite</span>
        </div>

        <div className="flex flex-col items-center gap-1 w-12 text-center opacity-60 pointer-events-none select-none cursor-not-allowed">
          <img src="/profile.svg" alt="Profile" style={{ width: 22, height: 22 }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#5A5472' }}>Profile</span>
        </div>
      </nav>
    </div>
  );
}