"use client";

import { useState } from "react";
import { Navigation, Plus } from "lucide-react";
import { ItineraryItem } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { formatMoney, formatTime12 } from "@/lib/utils";

const TYPE_DOT: Record<string, string> = {
  flight: "bg-sky-500",
  hotel: "bg-violet-500",
  restaurant: "bg-orange-500",
  activity: "bg-emerald-500",
  transport: "bg-amber-500",
  free_time: "bg-slate-400",
  other: "bg-rose-500",
};

export function MapView({ items, currency }: { items: ItineraryItem[]; currency: string }) {
  const pinned = items.filter((i) => i.mapX !== undefined && i.mapY !== undefined);
  const [selectedId, setSelectedId] = useState<string | null>(pinned[0]?.id ?? null);
  const selected = pinned.find((i) => i.id === selectedId);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative h-[320px] w-full overflow-hidden rounded-2xl border border-border bg-[radial-gradient(circle_at_20%_20%,hsl(var(--accent-soft)),transparent_45%),radial-gradient(circle_at_80%_70%,hsl(var(--muted)),transparent_50%)] bg-muted/40">
        <svg className="absolute inset-0 h-full w-full opacity-40" aria-hidden>
          <defs>
            <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="hsl(var(--border))" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {pinned
          .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
          .map((item, i, arr) => {
            const next = arr[i + 1];
            if (!next) return null;
            return (
              <svg key={item.id + "-line"} className="pointer-events-none absolute inset-0 h-full w-full">
                <line
                  x1={`${item.mapX}%`}
                  y1={`${item.mapY}%`}
                  x2={`${next.mapX}%`}
                  y2={`${next.mapY}%`}
                  stroke="hsl(var(--accent))"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  opacity="0.35"
                />
              </svg>
            );
          })}

        {pinned.map((item) => (
          <button
            key={item.id}
            onClick={() => setSelectedId(item.id)}
            style={{ left: `${item.mapX}%`, top: `${item.mapY}%` }}
            className="absolute -translate-x-1/2 -translate-y-full"
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] shadow-raised ring-2 ring-surface transition-transform ${
                TYPE_DOT[item.type] ?? "bg-accent"
              } ${selectedId === item.id ? "scale-125" : ""}`}
            >
              {item.emoji}
            </span>
          </button>
        ))}
      </div>

      {selected && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-start gap-2.5">
            <span className="text-[18px] leading-none">{selected.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14.5px] font-semibold text-foreground">{selected.name}</p>
              <p className="text-[12.5px] text-muted-foreground">
                {selected.location ?? "Location TBD"} · {formatTime12(selected.startTime)}
              </p>
            </div>
            {selected.cost !== undefined && <span className="shrink-0 text-[13px] font-medium text-muted-foreground">{formatMoney(selected.cost, currency)}</span>}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5">
              <Navigation className="h-3.5 w-3.5" /> Get directions
            </Button>
            <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground">
              View details
            </Button>
          </div>
        </div>
      )}

      {pinned.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-8 text-center text-muted-foreground">
          <Plus className="h-5 w-5" />
          <p className="text-[13px]">Add itinerary items with a location to see them on the map.</p>
        </div>
      )}
    </div>
  );
}
