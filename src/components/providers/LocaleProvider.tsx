"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";
import enMessages from "@/messages/en.json";
import esMessages from "@/messages/es.json";
import frMessages from "@/messages/fr.json";
import elMessages from "@/messages/el.json";

const MESSAGES: Record<Locale, typeof enMessages> = {
  en: enMessages,
  es: esMessages,
  fr: frMessages,
  el: elMessages,
};

/**
 * Deliberately a CLIENT-only locale source — no `cookies()`/`getLocale()`
 * call anywhere in a Server Component. Calling a dynamic API like
 * `cookies()` from the root layout (the obvious place to resolve locale
 * server-side) forces Next.js to render every single route through that
 * layout dynamically, since it can no longer prerender a page whose parent
 * layout reads a per-request value. Verified by building with and without
 * that approach: it turned `/`, `/about`, `/features`, `/pricing`, and
 * every `/app/**` page from prerendered static output (`○`) into
 * server-rendered-on-demand (`ƒ`) — a real perf/SEO regression for the
 * marketing pages this app depends on, for zero Phase-1 benefit (no actual
 * UI copy is translated yet — see PROJECT_STATE.md). Since next-intl's
 * hooks (`useLocale`, `useTranslations`) only need *a* React context to
 * exist, not a specific server-resolved value, resolving the locale
 * entirely client-side (this provider) keeps every route statically
 * prerenderable exactly as before, at the cost of one harmless render with
 * the default locale before this mounts (LocaleBridge.tsx swaps it to the
 * real value on mount) — acceptable since there's no translated content to
 * flash yet. Server Components can start reading `alxioum_locale` (see
 * src/lib/i18n/cookie.ts) via src/i18n/request.ts's `getRequestConfig`
 * later, once Phase 2/3 actually needs server-rendered translated content
 * and can make a deliberate per-route static/dynamic tradeoff then.
 */
interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Keeps the <html lang> attribute honest for assistive tech/SEO crawlers
  // without needing a server-resolved value — same client-side-toggle
  // pattern ThemeProvider uses for the dark/light class.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => setLocaleState(next), []);
  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);

  return (
    <LocaleContext.Provider value={value}>
      {/* Explicit timeZone silences next-intl's ENVIRONMENT_FALLBACK warning
          (logged — and visible as a scary-looking "Error:" block — during
          `next build`'s static generation whenever no timeZone is given).
          Nothing in this app formats dates/times through next-intl yet, so
          any fixed value is harmless; revisit if/when a Phase 2/3 feature
          needs per-user timezone-aware formatting. */}
      <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]} timeZone="UTC">
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}

/** Imperative setter for LocaleBridge (bootstrap/profile-sync) and
 * LanguageSwitcher (explicit user choice) — next-intl's own `useLocale()`
 * hook remains the read side, used anywhere that just needs to know the
 * current locale. */
export function useSetLocale(): (locale: Locale) => void {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useSetLocale must be used within LocaleProvider");
  return ctx.setLocale;
}
