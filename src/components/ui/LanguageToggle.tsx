'use client';

import { useTranslation } from '@/lib/i18n';

export function LanguageToggle() {
  const { locale, setLocale } = useTranslation();

  return (
    <button
      onClick={() => setLocale(locale === 'ru' ? 'en' : 'ru')}
      className="glass-badge px-3 py-1.5 text-sm font-medium cursor-pointer transition-all hover:scale-105"
    >
      {locale === 'ru' ? 'EN' : 'RU'}
    </button>
  );
}
