import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { translate } from '../i18n/dictionary';
import { COUNTRY_DISPLAY_EN } from '../i18n/countryDisplay';
import { LOCALE_STORAGE_KEY, type Locale } from '../i18n/locale';

export type { Locale };

interface LanguageContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  useEnglishUi: () => void;
  useChineseUi: () => void;
  toggleLocale: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  displayCountry: (name: string) => string;
  listJoiner: string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLocale(): Locale {
  try {
    const s = localStorage.getItem(LOCALE_STORAGE_KEY);
    return s === 'en' ? 'en' : 'zh';
  } catch {
    return 'zh';
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale);

  useEffect(() => {
    document.documentElement.lang = locale === 'en' ? 'en' : 'zh-CN';
  }, [locale]);

  const persist = useCallback((next: Locale) => {
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next);
      persist(next);
    },
    [persist]
  );

  const useEnglishUi = useCallback(() => {
    setLocale('en');
  }, [setLocale]);

  const useChineseUi = useCallback(() => {
    setLocale('zh');
  }, [setLocale]);

  const toggleLocale = useCallback(() => {
    setLocaleState((prev) => {
      const next = prev === 'zh' ? 'en' : 'zh';
      persist(next);
      return next;
    });
  }, [persist]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(key, locale, vars),
    [locale]
  );

  const displayCountry = useCallback(
    (name: string) => (locale === 'zh' ? name : COUNTRY_DISPLAY_EN[name] ?? name),
    [locale]
  );

  const listJoiner = locale === 'zh' ? '、' : ', ';

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      useEnglishUi,
      useChineseUi,
      toggleLocale,
      t,
      displayCountry,
      listJoiner,
    }),
    [locale, setLocale, useEnglishUi, useChineseUi, toggleLocale, t, displayCountry, listJoiner]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return ctx;
}
