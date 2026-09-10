"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Globe, Check } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useSetLocale } from "@/components/providers/LocaleProvider";
import { supabase } from "@/lib/supabase/client";
import { persistLocale } from "@/lib/i18n/cookie";
import { SUPPORTED_LOCALES, LOCALE_META, type Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

/**
 * Single language picker used both pre-auth (MarketingNav) and post-auth
 * (Profile > Settings, next to ThemeToggle). Signed-out visitors only get
 * localStorage + the cookie persisted (src/lib/i18n/cookie.ts); a signed-in
 * user additionally gets `profiles.language` updated so the preference
 * follows them across devices — same plain `.update()` (never `.upsert()`)
 * pattern app/layout.tsx uses for `tutorial_seen`, since `profiles` upsert
 * is broken by the column-restricted UPDATE grant (see PROJECT_STATE.md).
 *
 * `variant="compact"` renders an icon-only trigger for tight nav chrome
 * (MarketingNav); the default renders a labeled trigger suited to a
 * settings card (ProfilePage), matching ThemeToggle's own two-variant
 * pattern.
 */
export function LanguageSwitcher({ variant = "default" }: { variant?: "default" | "compact" }) {
  const locale = useLocale() as Locale;
  const setLocale = useSetLocale();
  const t = useTranslations("LanguageSwitcher");
  const { user, refreshProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function selectLocale(next: Locale) {
    setOpen(false);
    if (next === locale) return;

    persistLocale(next);
    setLocale(next); // instant — no page reload needed, locale is client React state

    if (user && supabase) {
      setSaving(true);
      // Plain update, not upsert — the row already exists for a signed-in
      // user, and profiles.upsert() is rejected server-side regardless (see
      // the comment on this exact pattern in app/layout.tsx).
      await supabase.from("profiles").update({ language: next }).eq("id", user.id);
      await refreshProfile();
      setSaving(false);
    }
  }

  const current = LOCALE_META[locale];

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={saving}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("srCurrentLanguage", { language: current.nativeName })}
        title={t("label")}
        className={cn(
          "flex items-center gap-1.5 rounded-full text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground disabled:opacity-60",
          variant === "compact" ? "h-9 w-9 justify-center" : "px-3 py-2 text-sm font-medium"
        )}
      >
        <Globe className="h-4 w-4" aria-hidden />
        {variant === "default" && <span>{current.flag} {current.nativeName}</span>}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <ul
            role="listbox"
            aria-label={t("label")}
            className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-card border border-border bg-surface py-1 shadow-raised"
          >
            {SUPPORTED_LOCALES.map((l) => {
              const meta = LOCALE_META[l];
              const active = l === locale;
              return (
                <li key={l} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => selectLocale(l)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                      active ? "font-semibold text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <span aria-hidden>{meta.flag}</span>
                    <span className="flex-1">{meta.nativeName}</span>
                    {active && <Check className="h-3.5 w-3.5" aria-hidden />}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
