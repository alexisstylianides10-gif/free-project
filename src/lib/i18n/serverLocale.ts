import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_LOCALE, isSupportedLocale, type Locale } from "@/lib/i18n/locales";

/**
 * Fetches just `profiles.language` for an AI route that doesn't otherwise
 * need the rest of the profile row (the onboarding research routes) —
 * mirrors the "select only what you need" pattern checkEntitlement() uses
 * for plan_status/trial_ends_at. Defaults to English on any miss (row not
 * found yet, column null, RLS denial) rather than failing the request —
 * language preference is never a hard requirement for an AI call to work.
 */
export async function getUserLanguage(client: SupabaseClient, userId: string): Promise<Locale> {
  const { data } = await client.from("profiles").select("language").eq("id", userId).maybeSingle();
  const value = (data as { language?: string } | null)?.language;
  return isSupportedLocale(value) ? value : DEFAULT_LOCALE;
}
