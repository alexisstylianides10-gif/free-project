import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/lib/i18n/locales";
import { LOCALE_COOKIE } from "@/lib/i18n/cookie";

/**
 * next-intl request config, deliberately set up WITHOUT locale-prefixed
 * routing (`/en/...`, `/es/...`) — this app already has a large,
 * deep-linked, unprefixed route tree (`src/app/**`, an OAuth callback
 * registered with Google at the literal path `/auth/callback`, a public
 * sitemap/robots pointing at unprefixed URLs) and locale-prefixing every
 * route would be a routing refactor with real regression risk for zero
 * Phase-1 benefit.
 *
 * NOT currently wired into any Server Component (root layout resolves
 * locale entirely client-side instead — see LocaleProvider.tsx's top
 * comment for why: calling `cookies()`/`getLocale()` anywhere in the
 * server render tree forces every route through that layout to render
 * dynamically instead of prerendering, which regressed this app's static
 * marketing pages when tried). This file exists so a *specific* future
 * route that deliberately wants server-rendered translated content (Phase
 * 2/3) can opt into reading the `alxioum_locale` cookie (see
 * src/lib/i18n/cookie.ts) via `getLocale()`/`getMessages()` on its own,
 * accepting that one route becoming dynamic as a deliberate tradeoff —
 * rather than every route paying that cost today for no benefit.
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isSupportedLocale(raw) ? raw : DEFAULT_LOCALE;

  const messages = (await import(`../messages/${locale}.json`)).default;

  return { locale, messages };
});
