'use client';

import { useId } from 'react';
import { CountUp } from '@/components/ui/CountUp';
import type { AdminStats } from '@/lib/admin';
import { paletteFor } from '@/lib/categoryPalette';
import { LOCALES, useI18n } from '@/i18n';

const CARD = 'flex flex-col gap-3 rounded-3xl border border-line bg-surface p-4';

function CardTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <h3 className="text-base font-extrabold text-ink">{title}</h3>
      {hint && <p className="text-xs font-medium text-muted">{hint}</p>}
    </div>
  );
}

/** Four numbers at the top: cards, active, swaps done, students. */
function Totals({ totals }: { totals: AdminStats['totals'] }) {
  const { t } = useI18n();
  const items = [
    { label: t.admin.totalCards, value: totals.cards },
    { label: t.admin.activeCards, value: totals.active },
    { label: t.admin.completedCards, value: totals.completed },
    { label: t.admin.students, value: totals.students },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item, index) => (
        <div
          key={item.label}
          style={{ animationDelay: `${index * 60}ms` }}
          className="flex animate-pop flex-col gap-0.5 rounded-2xl border border-line bg-surface px-4 py-3 motion-reduce:animate-none"
        >
          <span className="bg-linear-to-r from-brand-text-from to-brand-text-to bg-clip-text font-bricolage text-[28px] leading-9 font-extrabold text-transparent">
            <CountUp value={item.value} />
          </span>
          <span className="text-xs font-semibold text-muted">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Q1: needed vs offered per subject as paired horizontal bars. */
function Demand({ demand }: { demand: AdminStats['demand'] }) {
  const { t } = useI18n();
  const max = Math.max(1, ...demand.flatMap((row) => [row.needed, row.offered]));
  return (
    <section className={CARD}>
      <CardTitle title={t.admin.demandTitle} hint={t.admin.demandHint} />
      <div className="flex items-center gap-4 text-xs font-semibold text-muted">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-full bg-linear-to-r from-brand-from to-brand-to" />
          {t.admin.needed}
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-full bg-line-strong" />
          {t.admin.offered}
        </span>
      </div>
      <ul className="flex flex-col gap-3">
        {demand.map((row, index) => (
          <li key={row.subject} className="flex flex-col gap-1">
            <span className="flex items-center gap-2 text-sm font-bold text-ink">
              <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: paletteFor(row.category).dot }} />
              <span className="truncate">{row.subject}</span>
            </span>
            {[
              { value: row.needed, label: t.admin.needed, fill: 'bg-linear-to-r from-brand-from to-brand-to' },
              { value: row.offered, label: t.admin.offered, fill: 'bg-line-strong' },
            ].map((bar) => (
              <div key={bar.label} className="flex items-center gap-2">
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-soft">
                  <div
                    style={{ width: `${(bar.value / max) * 100}%`, animationDelay: `${150 + index * 60}ms` }}
                    className={`grow-x h-full rounded-full ${bar.fill}`}
                  />
                </div>
                <span className="w-7 text-right text-xs font-bold text-ink tabular-nums" aria-label={`${bar.label}: ${bar.value}`}>
                  {bar.value}
                </span>
              </div>
            ))}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Q2: new cards per day as a small line chart. */
function PerDay({ perDay }: { perDay: AdminStats['per_day'] }) {
  const { t, language } = useI18n();
  const gradientId = useId();
  const W = 300;
  const H = 110;
  const PAD = 8;
  const max = Math.max(1, ...perDay.map((d) => d.cards));
  const step = perDay.length > 1 ? (W - PAD * 2) / (perDay.length - 1) : 0;
  const points = perDay.map((d, i) => [PAD + i * step, H - PAD - (d.cards / max) * (H - PAD * 2)] as const);
  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = points.length ? `${PAD},${H - PAD} ${line} ${(PAD + (points.length - 1) * step).toFixed(1)},${H - PAD}` : '';
  const format = new Intl.DateTimeFormat(LOCALES[language], { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const label = (day: string) => format.format(new Date(`${day.slice(0, 10)}T00:00:00Z`));
  const total = perDay.reduce((sum, d) => sum + d.cards, 0);
  const summary = perDay.map((d) => `${label(d.day)}: ${d.cards}`).join(', ');

  return (
    <section className={CARD}>
      <div className="flex items-start justify-between gap-3">
        <CardTitle title={t.admin.perDayTitle} hint={t.admin.perDayHint} />
        <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-bold text-brand-ink tabular-nums">
          Σ {total}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${t.admin.perDayTitle}. ${summary}`} className="h-auto w-full">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-brand-from)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--color-brand-from)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={PAD} x2={W - PAD} y1={PAD + f * (H - PAD * 2)} y2={PAD + f * (H - PAD * 2)} className="stroke-line" strokeWidth="1" />
        ))}
        <polygon points={area} fill={`url(#${gradientId})`} className="animate-rise motion-reduce:animate-none" />
        <polyline
          points={line}
          fill="none"
          stroke="var(--color-brand-from)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          pathLength={1}
          className="draw-line"
        />
        {points.map(([x, y], i) => (
          <circle key={perDay[i].day} cx={x} cy={y} r="3" fill="var(--color-brand-to)">
            <title>{`${label(perDay[i].day)}: ${perDay[i].cards}`}</title>
          </circle>
        ))}
      </svg>
      {perDay.length > 0 && (
        <div className="flex justify-between text-[11px] font-semibold text-muted">
          <span>{label(perDay[0].day)}</span>
          <span>{label(perDay[perDay.length - 1].day)}</span>
        </div>
      )}
    </section>
  );
}

/** Q3: exact values per category, so a table. */
function Categories({ categories }: { categories: AdminStats['categories'] }) {
  const { t } = useI18n();
  return (
    <section className={CARD}>
      <CardTitle title={t.admin.categoriesTitle} />
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs font-semibold text-muted">
            <th scope="col" className="pb-2 font-semibold">{t.admin.category}</th>
            <th scope="col" className="pb-2 text-right font-semibold">{t.admin.cards}</th>
            <th scope="col" className="pb-2 text-right font-semibold">{t.admin.completed}</th>
            <th scope="col" className="pb-2 text-right font-semibold">{t.admin.rate}</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((row) => (
            <tr key={row.category} className="border-t border-line">
              <th scope="row" className="py-2 text-left font-bold text-ink">
                <span className="flex items-center gap-2">
                  <span aria-hidden className="size-2 rounded-full" style={{ background: paletteFor(row.category).dot }} />
                  {t.categories[row.category] ?? row.category}
                </span>
              </th>
              <td className="py-2 text-right font-semibold text-ink tabular-nums">{row.cards}</td>
              <td className="py-2 text-right font-semibold text-ink tabular-nums">{row.completed}</td>
              <td className="py-2 text-right font-bold text-brand-ink tabular-nums">{row.rate}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/** Statistics block of the admin page (End-term Part C5: the analysis results inside the product). */
export function StatsPanel({ stats }: { stats: AdminStats }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-4">
      <Totals totals={stats.totals} />
      <Demand demand={stats.demand} />
      <PerDay perDay={stats.per_day ?? []} />
      <Categories categories={stats.categories} />
      <p className="px-1 text-[11px] leading-4 font-medium text-muted">{t.admin.source}</p>
    </div>
  );
}
