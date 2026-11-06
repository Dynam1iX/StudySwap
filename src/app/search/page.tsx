'use client';

import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { StudentResults } from '@/components/search/StudentResults';
import { SwapDetailModal } from '@/components/feed/SwapDetailModal';
import { AppHeader } from '@/components/layout/AppHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { MobileShell, scrollAppToTop } from '@/components/layout/MobileShell';
import { CategoryGrid } from '@/components/search/CategoryGrid';
import { FilterBar, type FilterKind } from '@/components/search/FilterBar';
import { FilterSheet } from '@/components/search/FilterSheet';
import { RecentSearches } from '@/components/search/RecentSearches';
import { SearchField } from '@/components/search/SearchField';
import { SearchResults } from '@/components/search/SearchResults';
import { useFavoriteIds } from '@/lib/favorites';
import { fetchFeed, type FeedPost } from '@/lib/feed';
import {
  EMPTY_FILTERS,
  SEARCH_CATEGORIES,
  STUDY_YEARS,
  addRecentSearch,
  clearRecentSearches,
  countByCategory,
  deleteRecentSearch,
  fetchRecentSearches,
  filterPosts,
  hasActiveFilters,
  isProgram,
  type RecentSearch,
  type SearchFilters,
} from '@/lib/search';
import type { Category, StudyYear } from '@/types/database';
import { useT } from '@/i18n';

/** Filters live in the URL (?q=&category=&year=&program=) so Back and links work. */
function filtersFromParams(params: URLSearchParams): SearchFilters {
  const query = params.get('q')?.trim() || null;
  const category = params.get('category');
  const year = Number(params.get('year'));
  const program = params.get('program');
  return {
    query,
    category: SEARCH_CATEGORIES.includes(category as Category) ? (category as Category) : null,
    year: STUDY_YEARS.includes(year as StudyYear) ? (year as StudyYear) : null,
    program: isProgram(program) ? program : null,
  };
}

function filtersToSearch(filters: SearchFilters): string {
  const params = new URLSearchParams();
  if (filters.query) params.set('q', filters.query);
  if (filters.category) params.set('category', filters.category);
  if (filters.year) params.set('year', String(filters.year));
  if (filters.program) params.set('program', filters.program);
  const search = params.toString();
  return search ? `?${search}` : '';
}

function logError(action: string) {
  return (err: unknown) => console.error(`Error ${action}:`, err);
}

function SearchView() {
  const t = useT();
  const searchParams = useSearchParams();
  const filters = useMemo(() => filtersFromParams(new URLSearchParams(searchParams.toString())), [searchParams]);
  const showResults = hasActiveFilters(filters);

  const [searchQuery, setSearchQuery] = useState(filters.query ?? '');
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [recent, setRecent] = useState<RecentSearch[] | null>(null);
  const [openFilter, setOpenFilter] = useState<FilterKind | null>(null);
  const { liked: likedPosts, toggle: toggleLike } = useFavoriteIds();
  /** The card whose details modal is open, or null. */
  const [activeSwap, setActiveSwap] = useState<FeedPost | null>(null);
  // Hidden by Next (another tab opened): close the sheet, or it opens again on return.
  useLayoutEffect(() => () => setActiveSwap(null), []);
  const inputRef = useRef<HTMLInputElement>(null);
  /** The filter chip that opened the options (desktop drops them down from it). */
  const filterAnchor = useRef<HTMLElement | null>(null);

  // Back / Forward: show the submitted text of that history entry in the box.
  const [lastQuery, setLastQuery] = useState(filters.query);
  if (filters.query !== lastQuery) {
    setLastQuery(filters.query);
    setSearchQuery(filters.query ?? '');
  }

  useEffect(() => {
    let cancelled = false;
    fetchFeed()
      .then((data) => {
        if (!cancelled) setPosts(data.posts);
      })
      .catch((err: unknown) => {
        logError('fetching barter offers from Supabase')(err);
        if (!cancelled) setPosts([]);
      });
    fetchRecentSearches()
      .then((items) => {
        if (!cancelled) setRecent(items);
      })
      .catch((err: unknown) => {
        logError('loading recent searches')(err);
        if (!cancelled) setRecent([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => (posts ? countByCategory(posts) : null), [posts]);
  const results = useMemo(() => (posts ? filterPosts(posts, filters) : null), [posts, filters]);

  const applyFilters = useCallback((next: SearchFilters) => {
    window.history.pushState(null, '', `/search${filtersToSearch(next)}`);
    scrollAppToTop();
  }, []);

  /** Queries removed (×) while their save was still running: removed again once it lands. */
  const dropped = useRef(new Set<string>());
  /** Bumped by "Clear all", so a save that was running cannot bring the list back. */
  const clears = useRef(0);

  const submitSearch = (query: string) => {
    applyFilters({ ...filters, query: query || null });
    if (!query) return;
    const key = query.toLowerCase();
    dropped.current.delete(key);
    const clearsAtStart = clears.current;
    // Show it at the top right away, then sync with the database.
    setRecent((prev) => [
      { id: `pending-${query}`, query },
      ...(prev ?? []).filter((item) => item.query.toLowerCase() !== key),
    ].slice(0, 10));
    addRecentSearch(query)
      .then(async () => {
        if (clears.current !== clearsAtStart) {
          await clearRecentSearches();
          return [];
        }
        const items = await fetchRecentSearches();
        const gone = items.filter((item) => dropped.current.has(item.query.toLowerCase()));
        await Promise.all(gone.map((item) => deleteRecentSearch(item.id)));
        gone.forEach((item) => dropped.current.delete(item.query.toLowerCase()));
        return items.filter((item) => !gone.includes(item));
      })
      .then(setRecent)
      .catch(logError('saving the search'));
  };

  const pickRecent = (query: string) => {
    setSearchQuery(query);
    inputRef.current?.focus();
  };

  const removeRecent = (id: string) => {
    const item = recent?.find((r) => r.id === id);
    setRecent((prev) => prev?.filter((r) => r.id !== id) ?? prev);
    if (id.startsWith('pending-')) {
      if (item) dropped.current.add(item.query.toLowerCase());
    } else {
      deleteRecentSearch(id).catch(logError('removing a recent search'));
    }
  };

  const clearRecent = () => {
    clears.current += 1;
    setRecent([]);
    clearRecentSearches().catch(logError('clearing recent searches'));
  };

  return (
    <>
      {/* 16px sides, 8px top and bottom, 16px between blocks. */}
      <div className="flex flex-col gap-4 px-4 py-2">
        <h1 className="animate-rise font-bricolage text-3xl font-extrabold text-ink motion-reduce:animate-none">
          {t.search.title}
        </h1>

        {/* Phones: field, then the filter chips below. Desktop: one row. */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-3">
          <div style={{ animationDelay: '60ms' }} className="animate-rise motion-reduce:animate-none lg:flex-1">
            <SearchField
              value={searchQuery}
              onChange={setSearchQuery}
              onSubmit={submitSearch}
              inputRef={inputRef}
              hotkey
            />
          </div>

          <div style={{ animationDelay: '120ms' }} className="animate-rise motion-reduce:animate-none">
            <FilterBar
              year={filters.year}
              program={filters.program}
              openFilter={openFilter}
              onOpen={(kind, button) => {
                filterAnchor.current = button;
                setOpenFilter(kind);
              }}
            />
          </div>
        </div>

        {showResults ? (
          <>
          {filters.query && <StudentResults query={filters.query} />}
          <SearchResults
            key={filtersToSearch(filters)}
            filters={filters}
            posts={results}
            likedPosts={likedPosts}
            onToggleLike={toggleLike}
            onOpen={setActiveSwap}
            onClearFilter={(key) => applyFilters({ ...filters, [key]: null })}
            onClearAll={() => applyFilters(EMPTY_FILTERS)}
          />
          </>
        ) : (
          <>
            <section className="flex flex-col gap-4">
              <h2
                style={{ animationDelay: '180ms' }}
                className="animate-rise font-bricolage text-xl font-extrabold text-ink motion-reduce:animate-none"
              >
                {t.search.browse}
              </h2>
              <CategoryGrid
                counts={counts}
                delay={220}
                onSelect={(category) => applyFilters({ ...filters, category })}
              />
            </section>

            <RecentSearches
              items={recent}
              delay={480}
              onPick={pickRecent}
              onRemove={removeRecent}
              onClearAll={clearRecent}
            />
          </>
        )}
      </div>

      <FilterSheet
        kind={openFilter}
        year={filters.year}
        program={filters.program}
        onYearChange={(year) => applyFilters({ ...filters, year })}
        onProgramChange={(program) => applyFilters({ ...filters, program })}
        onClose={() => setOpenFilter(null)}
        anchor={filterAnchor}
      />

      <SwapDetailModal post={activeSwap} onClose={() => setActiveSwap(null)} />
    </>
  );
}

export default function SearchPage() {
  return (
    <MobileShell wide footer={<BottomNav active="search" />}>
      <AppHeader />
      <Suspense>
        <SearchView />
      </Suspense>
    </MobileShell>
  );
}
