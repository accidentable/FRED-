/**
 * Hybrid i18n system for FRED-OS
 *
 * Rules:
 * - UI Labels (buttons, headers, system logs): English by default (terminal aesthetic)
 * - Content (indicator descriptions, AI analysis, tooltips): Korean by default
 * - User can override via locale preference
 */

import { create } from 'zustand';
import ko from '@/locales/ko.json';
import en from '@/locales/en.json';

export type Locale = 'ko' | 'en';
type Translations = typeof ko;

const locales: Record<Locale, Translations> = { ko, en };

// ─── Locale Store ────────────────────────────────────────────────────

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: 'ko', // Korean-first default
  setLocale: (locale) => set({ locale }),
}));

// ─── Translation Hook ────────────────────────────────────────────────

/**
 * Access a nested value from a translation object by dot-path.
 * e.g., getText('chart.unit') → '단위' (ko) or 'UNIT' (en)
 */
function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current == null || typeof current !== 'object') return path;
    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === 'string' ? current : path;
}

export function useTranslation() {
  const { locale, setLocale } = useLocaleStore();
  const translations = locales[locale];

  /**
   * Get a translated string by key path.
   * @param key - Dot-notation key, e.g. 'right_panel.header'
   * @param fallbackLocale - Optional fallback locale if key not found
   */
  const t = (key: string, fallbackLocale?: Locale): string => {
    const value = getNestedValue(translations as unknown as Record<string, unknown>, key);
    if (value !== key) return value;

    // Fallback to other locale
    const fb = fallbackLocale || (locale === 'ko' ? 'en' : 'ko');
    return getNestedValue(locales[fb] as unknown as Record<string, unknown>, key);
  };

  /**
   * Get indicator info (title + description) in current locale.
   */
  const indicator = (id: string): { title: string; desc: string } => {
    const data = (translations as unknown as Record<string, unknown>).indicators as
      Record<string, { title: string; desc: string }> | undefined;
    if (data && data[id]) return data[id];

    // Fallback
    const fb = locale === 'ko' ? en : ko;
    const fbData = (fb as unknown as Record<string, unknown>).indicators as
      Record<string, { title: string; desc: string }> | undefined;
    if (fbData && fbData[id]) return fbData[id];

    return { title: id, desc: '' };
  };

  /**
   * Get category name in current locale.
   */
  const category = (key: string): string => {
    return t(`categories.${key}`);
  };

  return { t, indicator, category, locale, setLocale };
}

/**
 * Standalone helper for non-React contexts (e.g., store initialization).
 */
export function getText(key: string, locale: Locale = 'ko'): string {
  return getNestedValue(locales[locale] as unknown as Record<string, unknown>, key);
}
