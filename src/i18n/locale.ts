export type Locale = 'zh' | 'en';

export const LOCALE_STORAGE_KEY = 'samun_ui_locale';

export function isLocale(value: string | null): value is Locale {
  return value === 'zh' || value === 'en';
}
