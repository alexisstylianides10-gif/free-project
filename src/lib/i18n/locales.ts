/**
 * Single source of truth for the four locales Alxioum supports (Phase 1 of
 * the i18n rollout — see PROJECT_STATE.md). Every other locale-aware piece
 * of the app (the language switcher, the `profiles.language` DB check
 * constraint, next-intl's request config, and the AI language-instruction
 * builders in src/lib/i18n/aiInstruction.ts) reads from this file rather
 * than re-declaring the locale list, so adding/removing a language is a
 * one-file change.
 */
export const SUPPORTED_LOCALES = ["en", "es", "fr", "el"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export interface LocaleMeta {
  /** English name of the language — used in AI system-prompt instructions
   * ("Respond in {name}..."), where writing "Spanish" reads more reliably
   * to the model than the native name or ISO code. */
  englishName: string;
  /** Name as a native speaker of that language would write it — this is
   * what the language switcher UI displays, so a Greek student sees
   * "Ελληνικά", not "Greek". */
  nativeName: string;
  flag: string;
}

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  en: { englishName: "English", nativeName: "English", flag: "🇬🇧" },
  es: { englishName: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  fr: { englishName: "French", nativeName: "Français", flag: "🇫🇷" },
  el: { englishName: "Greek", nativeName: "Ελληνικά", flag: "🇬🇷" },
};

export function isSupportedLocale(value: unknown): value is Locale {
  return typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Maps a BCP-47 language tag (e.g. `navigator.language`, an
 * `Accept-Language` entry) to one of our supported locales by comparing
 * just the primary subtag ("es-MX" -> "es"), falling back to English for
 * anything we don't support rather than guessing.
 */
export function localeFromLanguageTag(tag: string | null | undefined): Locale {
  if (!tag) return DEFAULT_LOCALE;
  const primary = tag.split(/[-_]/)[0]?.toLowerCase();
  return isSupportedLocale(primary) ? primary : DEFAULT_LOCALE;
}
