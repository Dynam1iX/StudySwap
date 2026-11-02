'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Mail } from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { MobileShell } from '@/components/layout/MobileShell';
import { QuickSettings } from '@/components/settings/QuickSettings';
import { LEGAL, LEGAL_CONTACT, LEGAL_UPDATED, type LegalKind } from '@/i18n/legal';
import { LOCALES, useI18n } from '@/i18n';

/**
 * Terms of Use or Privacy Policy, in the interface language. Open without signing in
 * (AuthGate lets these paths through): the login page links here.
 */
export function LegalPage({ kind }: { kind: LegalKind }) {
  const { t, language } = useI18n();
  const router = useRouter();
  const doc = LEGAL[language][kind];
  const other: LegalKind = kind === 'terms' ? 'privacy' : 'terms';
  const updated = new Date(`${LEGAL_UPDATED}T00:00:00`).toLocaleDateString(LOCALES[language], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const back = () => {
    if (window.history.length > 1) router.back();
    else router.push('/');
  };

  return (
    <MobileShell>
      <AppHeader actions={<QuickSettings />} />

      <article className="flex flex-col gap-5 px-4 py-2">
        <div className="flex animate-rise flex-col gap-2 motion-reduce:animate-none">
          <button
            type="button"
            onClick={back}
            className="-ml-1 flex w-fit cursor-pointer items-center gap-0.5 rounded-full py-1 pr-2 text-sm font-semibold text-muted transition hover:text-ink"
          >
            <ChevronLeft aria-hidden className="size-4.5" />
            {t.legal.back}
          </button>
          <h1 className="font-bricolage text-[28px] leading-9 font-extrabold text-ink">{doc.title}</h1>
          <p className="text-xs font-semibold text-muted">
            {t.legal.updated}: {updated}
          </p>
          <p className="text-[15px] leading-6 font-medium text-ink">{doc.intro}</p>
        </div>

        {doc.sections.map((section, index) => (
          <section
            key={section.heading}
            id={section.id}
            style={{ animationDelay: `${Math.min(index + 1, 6) * 60}ms` }}
            className="flex scroll-mt-4 animate-rise flex-col gap-2 rounded-3xl border border-line bg-surface p-4 motion-reduce:animate-none"
          >
            <h2 className="font-bricolage text-lg font-extrabold text-ink">{section.heading}</h2>
            {section.paragraphs?.map((text) => (
              <p key={text} className="text-sm leading-[22px] font-medium text-ink">
                {text}
              </p>
            ))}
            {section.list && (
              <ul className="flex flex-col gap-1.5">
                {section.list.map((text) => (
                  <li key={text} className="flex gap-2.5 text-sm leading-[22px] font-medium text-ink">
                    <span aria-hidden className="mt-[9px] size-1.5 shrink-0 rounded-full bg-linear-to-br from-brand-from to-brand-to" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <section className="flex flex-col gap-2 rounded-3xl bg-brand-soft p-4">
          <h2 className="font-bricolage text-lg font-extrabold text-ink">{t.legal.contact}</h2>
          <p className="text-sm font-medium text-ink">StudySwap team · SE-2625 · Astana IT University</p>
          <a
            href={`mailto:${LEGAL_CONTACT}`}
            className="flex w-fit items-center gap-2 text-sm font-bold text-brand-ink underline-offset-2 hover:underline"
          >
            <Mail aria-hidden className="size-4" />
            {LEGAL_CONTACT}
          </a>
        </section>

        <Link href={`/${other}`} className="w-fit text-sm font-bold text-brand-ink underline-offset-2 hover:underline">
          {t.legal.otherDoc[kind]} →
        </Link>
      </article>
    </MobileShell>
  );
}
