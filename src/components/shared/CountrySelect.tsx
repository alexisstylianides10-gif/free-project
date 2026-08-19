"use client";

import { useMemo, useState } from "react";
import { Search, Check } from "lucide-react";
import { COUNTRIES } from "@/lib/catalog/countries";
import { cn } from "@/lib/utils";

export function CountrySelect({ value, onChange }: { value: string; onChange: (country: string) => void }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return COUNTRIES;
    const q = query.trim().toLowerCase();
    return COUNTRIES.filter((c) => c.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="flex h-full flex-col">
      <div className="relative mb-3 shrink-0">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search countries"
          className="h-11 w-full rounded-2xl border border-border bg-surface pl-10 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-accent/60"
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
              {country}
              {selected && <Check className="h-4 w-4 text-accent" strokeWidth={3} />}
            </button>
          );
        })}
        {filtered.length === 0 && <p className="px-2 py-6 text-center text-sm text-muted-foreground">No countries match.</p>}
      </div>
    </div>
  );
}
