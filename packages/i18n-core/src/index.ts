// @rcooler/i18n-core: texts in Ukrainian and English, with keys the compiler checks. No UI framework: a React provider or a Lit controller wraps `createTranslator`.
//
// The app owns its dictionaries. English is the contract: `type MessageKey = keyof typeof en`, and
// declaring `uk` as `Dictionary<MessageKey>` makes a missing or misspelled key a compile error.
// Two key conventions are fixed here because the helpers build keys from data:
// `error.<code>` (with `error.unknown` as the fallback) and `<base>.<plural category>`. Since
// English is the contract, it also lists the plural forms only Ukrainian selects (few, many).

/** The supported languages, Ukrainian first: it is the default. */
export const LOCALES = ["uk", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/**
 * The supported locale a language tag belongs to: "uk-UA" and "UK" give "uk". Anything else,
 * including a missing tag, gives `fallback`.
 */
export function toLocale(value: string | undefined, fallback: Locale = "uk"): Locale {
  return LOCALES.find((locale) => value?.toLowerCase().startsWith(locale)) ?? fallback;
}

/** Values for the `{name}` placeholders of a text. */
export type Values = Readonly<Record<string, string | number>>;

/**
 * Fills `{name}` placeholders. A placeholder without a value is left visible: a missing value is
 * a bug, and a visible one gets fixed.
 */
export function fill(template: string, values: Values = {}): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in values ? String(values[name]) : placeholder,
  );
}

/** All texts of one language. */
export type Dictionary<Key extends string> = Readonly<Record<Key, string>>;

/** The texts of every supported language, with the same keys in each. */
export type Dictionaries<Key extends string> = Readonly<Record<Locale, Dictionary<Key>>>;

/** The key every dictionary needs: the text for a failure nobody wrote a text for. */
export const UNKNOWN_ERROR_KEY = "error.unknown";

/** The bases that have plural forms: every key ending in ".other", without that ending. */
export type PluralBase<Key extends string> = Key extends `${infer Base}.other` ? Base : never;

/**
 * What a part of the UI needs to speak one language. The members are plain functions, so they can
 * be taken apart: `const { t, errorText } = translator`.
 */
export interface Translator<Key extends string> {
  readonly locale: Locale;
  /** The text for a key, with its placeholders filled. */
  readonly t: (key: Key, values?: Values) => string;
  /** The text for a key built from data (an event type a server sent), or undefined when there is none. */
  readonly lookup: (key: string) => string | undefined;
  /**
   * The text for a failed call, chosen by the error's `code` through the key `error.<code>`. An
   * error without a code, or with one that has no text, gives `error.unknown`. The error's own
   * message is never shown: it may come from a server and is not written for users.
   */
  readonly errorText: (error: unknown) => string;
  /**
   * The text for a count in the language's plural form, from the key `<base>.<category>` with the
   * category of Intl.PluralRules (uk: one, few, many, other; en: one, other). A missing form falls
   * back to `<base>.other`. `{count}` is filled with the count unless `values` sets it.
   */
  readonly plural: (base: PluralBase<Key>, count: number, values?: Values) => string;
}

/** The stable code of a failed call, when the error carries one (as `ApiError` of @rcooler/http does). */
export function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

/**
 * Returns the translator of one language over the app's dictionaries. The dictionaries must
 * contain `error.unknown`; leaving it out is a compile error.
 */
export function createTranslator<Key extends string>(
  dictionaries: Dictionaries<Key> & Dictionaries<typeof UNKNOWN_ERROR_KEY>,
  locale: Locale,
): Translator<Key> {
  const dictionary: Readonly<Record<string, string>> = dictionaries[locale];
  const lookup = (key: string) => (Object.hasOwn(dictionary, key) ? dictionary[key] : undefined);
  const unknownError = dictionaries[locale][UNKNOWN_ERROR_KEY];
  const pluralRules = new Intl.PluralRules(locale);

  return {
    locale,
    // A key the types allowed but the dictionary lacks can only come from a cast; showing the
    // key itself makes that visible.
    t: (key, values) => fill(lookup(key) ?? key, values),
    lookup,
    errorText: (error) => {
      const code = errorCode(error);
      return (code === undefined ? undefined : lookup(`error.${code}`)) ?? unknownError;
    },
    plural: (base, count, values) => {
      const template =
        lookup(`${base}.${pluralRules.select(count)}`) ?? lookup(`${base}.other`) ?? base;
      return fill(template, { count, ...values });
    },
  };
}
