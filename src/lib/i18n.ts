'use client';

import { createContext, useContext } from 'react';
import ru from '@/locales/ru.json';
import en from '@/locales/en.json';

export type Locale = 'ru' | 'en';

const translations: Record<Locale, typeof ru> = { ru, en };

export interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

export const I18nContext = createContext<I18nContextType>({
  locale: 'ru',
  setLocale: () => {},
  t: (key: string) => key,
});

export function useTranslation() {
  return useContext(I18nContext);
}

export function getTranslation(locale: Locale, key: string): string {
  const keys = key.split('.');
  let result: unknown = translations[locale];
  for (const k of keys) {
    if (result && typeof result === 'object' && k in result) {
      result = (result as Record<string, unknown>)[k];
    } else {
      return key;
    }
  }
  return typeof result === 'string' ? result : key;
}
