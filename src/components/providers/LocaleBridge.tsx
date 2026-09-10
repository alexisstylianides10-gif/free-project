"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { useAuth } from "@/components/providers/AuthProvider";
import { useSetLocale } from "@/components/providers/LocaleProvider";
import { detectInitialLocale, persistLocale, readLocaleCookie } from "@/lib/i18n/cookie";
import type { Locale } from "@/lib/i18n/locales";

/**
 * Invisible bridge between LocaleProvider's client-only locale state (see
 * that file's top comment) and the two places the "preferred" locale
 * actually lives: localStorage (pre-auth) and `profiles.language`
 * (post-auth, source of truth once known). Mounted once near the root (see
 * layout.tsx) inside both LocaleProvider and AuthProvider so it can read
 * both.
 *
 * Two jobs:
 * 1. First-ever visit on a device (no cookie yet): detect a locale from
 *    localStorage or the browser's `navigator.language` and apply it.
 * 2. Right after a profile loads: `profiles.language` overrides whatever
 *    the cookie/localStorage had, since the account may have set its
 *    language preference on a different device.
 * Both just call `setLocale()` directly — no page reload needed, since the
 * locale lives in React state (LocaleProvider), not anything server-resolved.
 */
export function LocaleBridge() {
  const currentLocale = useLocale() as Locale;
  const setLocale = useSetLocale();
  const { profile } = useAuth();
  const didBootstrapRef = useRef(false);
  const lastSyncedProfileLocaleRef = useRef<Locale | null>(null);

  useEffect(() => {
    if (didBootstrapRef.current) return;
    didBootstrapRef.current = true;
    const existing = readLocaleCookie();
    const detected = existing ?? detectInitialLocale();
    persistLocale(detected);
    if (detected !== currentLocale) setLocale(detected);
    // Intentionally runs once on mount only — this is a one-time bootstrap,
    // not a reactive sync (that's the effect below, for post-auth).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const profileLocale = profile?.language as Locale | undefined;
    if (!profileLocale) return;
    if (lastSyncedProfileLocaleRef.current === profileLocale) return;
    lastSyncedProfileLocaleRef.current = profileLocale;
    persistLocale(profileLocale);
    if (profileLocale !== currentLocale) setLocale(profileLocale);
  }, [profile?.language, currentLocale, setLocale]);

  return null;
}
