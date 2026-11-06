'use client';

import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { StudentLink } from '@/components/student/StudentLink';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { getInitials } from '@/lib/format';
import { searchStudents, type FoundStudent } from '@/lib/search';
import type { StudyYear } from '@/types/database';
import { useT } from '@/i18n';

/** Shown first; the rest behind "Show all". */
const FIRST = 4;

/**
 * "Students" above the card results: people whose name matches the query (any registered
 * student or teacher). Hidden when nobody matches. Each row opens the person's profile.
 */
export function StudentResults({ query }: { query: string }) {
  const t = useT();
  const [found, setFound] = useState<{ query: string; students: FoundStudent[] } | null>(null);
  const [all, setAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    searchStudents(query)
      .then((students) => {
        if (!cancelled) setFound({ query, students });
      })
      .catch((err: unknown) => {
        // Before the migration (or offline): the card results still work.
        console.error('Error searching students:', err);
        if (!cancelled) setFound({ query, students: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  if (!found || found.query !== query || found.students.length === 0) return null;
  const shown = all ? found.students : found.students.slice(0, FIRST);

  return (
    <section aria-label={t.search.students} className="flex animate-rise flex-col gap-3 motion-reduce:animate-none">
      <h2 className="font-bricolage text-xl font-extrabold text-ink">
        {t.search.students} <span className="text-muted">· {found.students.length}</span>
      </h2>
      <ul className="flex flex-col gap-2">
        {shown.map((student, index) => {
          const subtitle =
            student.degree_level === 'Teacher' || !student.study_year
              ? `${student.major ?? ''}${student.major ? ', ' : ''}${t.common.teacher}`
              : `${student.major ?? ''}${student.major ? ', ' : ''}${t.common.year(student.study_year)}`;
          return (
            <li
              key={student.id}
              style={{ animationDelay: `${Math.min(index, 6) * 50}ms` }}
              className="animate-rise motion-reduce:animate-none"
            >
              <StudentLink
                author={{
                  id: student.id,
                  full_name: student.full_name,
                  major: student.major ?? '',
                  study_year: student.study_year as StudyYear | null,
                  avatar_path: student.avatar_path,
                }}
                label={t.search.openStudent(student.full_name)}
                className="group flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 transition hover:border-brand-from/40 hover:bg-soft active:scale-[0.99]"
              >
                <span data-student-avatar className="shrink-0">
                  <UserAvatar initials={getInitials(student.full_name)} path={student.avatar_path} className="size-12 text-sm" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[15px] font-bold text-ink">{student.full_name}</span>
                  <span className="truncate text-xs font-medium text-muted">{subtitle}</span>
                </span>
                {student.active_cards > 0 && (
                  <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-bold text-brand-ink">
                    {t.search.activeCards(student.active_cards)}
                  </span>
                )}
                <ChevronRight
                  aria-hidden
                  className="size-4 shrink-0 text-placeholder transition-transform duration-300 group-hover:translate-x-0.5"
                />
              </StudentLink>
            </li>
          );
        })}
      </ul>
      {!all && found.students.length > FIRST && (
        <button
          type="button"
          onClick={() => setAll(true)}
          className="h-11 w-fit cursor-pointer px-1 text-sm font-bold text-brand-ink transition active:scale-95"
        >
          {t.search.showAllStudents(found.students.length)}
        </button>
      )}
    </section>
  );
}
