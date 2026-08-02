"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { Trip } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn, daysUntil, formatDateRange } from "@/lib/utils";

export function TripCard({
  trip,
  memberCount,
  progress,
}: {
  trip: Trip;
  memberCount: number;
  progress: number;
}) {
  const days = daysUntil(trip.startDate);
  const countdownLabel = days > 0 ? `${days} day${days === 1 ? "" : "s"} to go` : days === 0 ? "Today!" : "In progress";

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card transition-shadow hover:shadow-raised">
      <div className={cn("relative flex h-36 items-end bg-gradient-to-br p-4", trip.coverGradient)}>
        <span className="absolute right-4 top-4 rounded-full bg-black/20 px-2.5 py-1 text-[11.5px] font-medium text-white backdrop-blur-sm">
          {countdownLabel}
        </span>
        <span className="text-5xl drop-shadow-sm">{trip.coverEmoji}</span>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2">
          <span className="text-[17px] leading-none">{trip.countryFlag}</span>
          <h3 className="text-[16px] font-semibold tracking-tight text-foreground">{trip.name.toUpperCase()}</h3>
        </div>
        <p className="mt-1 truncate text-[13px] text-muted-foreground">{trip.cities.join(" • ")}</p>
        <div className="mt-2 flex items-center gap-3 text-[12.5px] text-muted-foreground">
          <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" /> {memberCount} traveler{memberCount === 1 ? "" : "s"}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <ProgressBar value={progress} className="flex-1" />
          <span className="text-[11.5px] font-medium text-muted-foreground">{progress}% planned</span>
        </div>

        <Link href={`/trip?tripId=${trip.id}`} className="mt-3 block">
          <Button size="sm" className="w-full">
            View Trip
          </Button>
        </Link>
      </div>
    </div>
  );
}
