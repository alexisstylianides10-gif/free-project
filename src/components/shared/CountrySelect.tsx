"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, Check } from "lucide-react";
import { COUNTRIES } from "@/lib/catalog/countries";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

/**
 * `value`/`onChange` always carry the canonical English country name from
 * `COUNTRIES` (stored as-is in `profiles.country` and used verbatim by the
 * AI research-school route's web search) — only the on-screen label is
 * translated, via the "Countries" i18n namespace keyed by that same English
 * name, so switching locale never changes what gets saved or searched.
 */
export function CountrySelect({ value, onChange }: { value: string; onChange: (country: string) => void }) {
  const [query, setQuery] = useState("");
  const t = useTranslations("CountrySelect");
  const tCountries = useTranslations("Countries");

  const filtered = useMemo(() => {
    if (!query.trim()) return COUNTRIES;
    const q = query.trim().toLowerCase();
    return COUNTRIES.filter((c) => c.toLowerCase().includes(q) || tCountries(c).toLowerCase().includes(q));
  }, [query, tCountries]);

  return (
    <div className="flex h-full flex-col">
      <div className="relative mb-3 shrink-0">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="pl-10"
        />
      </div>
      <div className="scrollbar-none flex-1 space-y-1.5 overflow-y-auto pb-2">
        {filtered.map((country) => {
          const selected = value === country;
          return (
            <button
              key={country}
              type="button"
              onClick={() => onChange(country)}
              className={cn(
                "flex w-full items-center justify-between rounded-xl border px-4 py-2.5 text-left text-sm transition-colors",
                selected ? "border-accent/70 bg-accent-soft/60 text-white" : "border-transparent bg-surface text-foreground hover:border-border"
              )}
            >
              {tCountries(country)}
              {selected && <Check className="h-4 w-4 text-accent" strokeWidth={3} />}
            </button>
          );
        })}
        {filtered.length === 0 && <p className="px-2 py-6 text-center text-sm text-muted-foreground">{t("noMatch")}</p>}
      </div>
    </div>
  );
}
