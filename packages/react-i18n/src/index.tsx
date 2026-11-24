// @rcooler/react-i18n: the language of a React app. A provider holds the chosen locale, remembers
// it in the browser and gives every component below the translator of @rcooler/i18n-core.
//
// const { I18nProvider, useI18n } = createI18n({ en, uk }, { storageKey: "app.locale" });
import {
  LOCALES,
  createTranslator,
  toLocale,
  type Dictionaries,
  type Locale,
  type Translator,
  type UNKNOWN_ERROR_KEY,
} from "@rcooler/i18n-core";
import { createContext, use, useEffect, useMemo, useState, type ReactNode } from "react";

export interface I18n<Key extends string> extends Translator<Key> {
  /** The locales the app speaks, for a switch. */
  readonly locales: readonly Locale[];
  readonly setLocale: (locale: Locale) => void;
}

export interface I18nOptions {
  /** Browser storage key the choice is kept under; not remembered when omitted. */
  storageKey?: string;
  /** Locale when nothing is stored and the browser's language is not supported; "uk" when omitted. */
  fallback?: Locale;
}

export interface I18nProviderProps {
  children: ReactNode;
  /** Starts in this locale instead of the stored or the browser's one (tests, previews). */
  initialLocale?: Locale;
}

/** The stored choice, or the browser's language. Storage can be unavailable (private mode). */
export function initialLocale(storageKey: string | undefined, fallback: Locale): Locale {
  if (storageKey !== undefined) {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored !== null) return toLocale(stored, fallback);
    } catch {
      // No storage: fall through to the browser's language.
    }
  }
  return toLocale(typeof navigator === "undefined" ? undefined : navigator.language, fallback);
}

/** Creates the provider and the hook for one app's dictionaries. */
export function createI18n<Key extends string>(
  dictionaries: Dictionaries<Key> & Dictionaries<typeof UNKNOWN_ERROR_KEY>,
  options: I18nOptions = {},
) {
  const fallback = options.fallback ?? "uk";
  const Context = createContext<I18n<Key> | null>(null);

  function I18nProvider({ children, initialLocale: forced }: I18nProviderProps) {
    const [locale, setLocale] = useState<Locale>(
      () => forced ?? initialLocale(options.storageKey, fallback),
    );

    useEffect(() => {
      document.documentElement.lang = locale;
      if (options.storageKey === undefined) return;
      try {
        window.localStorage.setItem(options.storageKey, locale);
      } catch {
        // The choice then lasts for this visit only, which is all that can be done without storage.
      }
    }, [locale]);

    const value = useMemo<I18n<Key>>(
      () => ({ ...createTranslator(dictionaries, locale), locales: LOCALES, setLocale }),
      [locale],
    );
    return <Context value={value}>{children}</Context>;
  }

  function useI18n(): I18n<Key> {
    const value = use(Context);
    if (!value) throw new Error("useI18n needs an I18nProvider above it");
    return value;
  }

  return { I18nProvider, useI18n };
}
