"use client";

import { DEFAULT_LOCALE, isSupportedLocale, localeFromLanguageTag, type Locale } from "@/lib/i18n/locales";

/**
 * Non-httpOnly cookie holding the active locale — deliberately readable by
 * both the browser (LanguageSwitcher writes it, document.cookie reads it)
 * and the server (src/i18n/request.ts reads it via next/headers `cookies()`
 * on every request, since this app uses next-intl "without i18n routing":
 * no `/en/...`/`/es/...` URL prefixes, just this cookie as the source of
 * truth for which locale to render). 1 year expiry mirrors how long a theme
 * preference (localStorage) is expected to stick around.
 */
export const LOCALE_COOKIE = "alxioum_locale";
const LOCALE_STORAGE_KEY = "alxioum_locale";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function readLocaleCookie(): Locale | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
  const value = match ? decodeURIComponent(match[1]) : null;
  return isSupportedLocale(value) ? value : null;
}

export function writeLocaleCookie(locale: Locale) {
  if (typeof document === "undefined") return;
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
}

export function readLocaleLocalStorage(): Locale | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  return isSupportedLocale(value) ? value : null;
}

export function writeLocaleLocalStorage(locale: Locale) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

/**
 * Applies a locale change on both persistence layers used pre-auth
 * (localStorage) and every request (the cookie next-intl's request config
 * reads) — call this any time the active locale should change, then let the
 * caller trigger a `router.refresh()` so Server Components re-render with
 * the new locale's messages.
 */
export function persistLocale(locale: Locale) {
  writeLocaleCookie(locale);
  writeLocaleLocalStorage(locale);
}

/** Best-effort locale guess for a first-time, never-configured visitor:
 * localStorage (a returning pre-auth visitor on this device) first, then
 * the browser's own language, else English. */
export function detectInitialLocale(): Locale {
  const stored = readLocaleLocalStorage();
  if (stored) return stored;
  if (typeof navigator !== "undefined") {
    return localeFromLanguageTag(navigator.language);
  }
  return DEFAULT_LOCALE;
}
