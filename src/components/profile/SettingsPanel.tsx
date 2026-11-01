'use client';

import Link from 'next/link';
import { ChevronRight, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { SoundToggle } from '@/components/settings/SoundToggle';
import { useI18n } from '@/i18n';

interface SettingsPanelProps {
  onOpenPrivacy?: () => void;
  /** Administrators only: a row that opens the admin panel (/admin). */
  showAdmin?: boolean;
}

export function SettingsPanel({ onOpenPrivacy, showAdmin = false }: SettingsPanelProps) {
  const { t, language, setLanguage } = useI18n();
  return (
    <div className="flex flex-col rounded-3xl border border-line bg-surface px-4 py-1.5">
      <div className="flex h-16 items-center justify-between border-b border-line">
        <span className="text-base font-bold text-ink">{t.settings.language}</span>
        <LanguageSwitcher value={language} onChange={setLanguage} />
      </div>
      <div className="flex h-16 items-center justify-between border-b border-line">
        <span className="text-base font-bold text-ink">{t.settings.theme}</span>
        <ThemeToggle />
      </div>
      <div className="flex h-16 items-center justify-between border-b border-line">
        <span className="text-base font-bold text-ink">{t.settings.sounds}</span>
        <SoundToggle />
      </div>
      {showAdmin && (
        <Link href="/admin" className="group flex h-14 items-center justify-between border-b border-line">
          <span className="flex items-center gap-2.5 text-base font-bold text-ink">
            <LayoutDashboard aria-hidden className="size-5 text-brand-from" strokeWidth={2.2} />
            {t.settings.admin}
          </span>
          <ChevronRight aria-hidden className="size-5 text-muted transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
      <button
        type="button"
        onClick={onOpenPrivacy}
        aria-haspopup="dialog"
        className="group flex h-14 cursor-pointer items-center justify-between text-left"
      >
        <span className="flex items-center gap-2.5 text-base font-bold text-ink">
          <ShieldCheck aria-hidden className="size-5 text-brand-from" strokeWidth={2.2} />
          {t.settings.privacy}
        </span>
        <ChevronRight aria-hidden className="size-5 text-muted transition-transform group-hover:translate-x-0.5" />
      </button>
    </div>
  );
}
