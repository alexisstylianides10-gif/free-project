"use client";

import { CalendarEvent } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { addDaysISO, cn, eventOccursOn, formatTime12, todayISO } from "@/lib/utils";
import { Plus } from "lucide-react";

export function WeekAgenda({
  weekStart,
  events,
  onEventClick,
  onAddDay,
}: {
  weekStart: string;
  events: CalendarEvent[];
  onEventClick: (e: CalendarEvent) => void;
  onAddDay: (date: string) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i));
  const today = todayISO();

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
      {days.map((date) => {
        const dayEvents = events.filter((e) => eventOccursOn(e, date)).sort((a, b) => a.startTime.localeCompare(b.startTime));
        const d = new Date(date + "T00:00:00");
        const isToday = date === today;
        return (
          <div key={date} className={cn("rounded-xl border border-border bg-surface p-3", isToday && "border-accent/40 bg-accent-soft/20")}>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {d.toLocaleDateString("en-US", { weekday: "short" })}
                </p>
                <p className={cn("text-[15px] font-semibold", isToday ? "text-accent" : "text-foreground")}>{d.getDate()}</p>
              </div>
              <button
                onClick={() => onAddDay(date)}
                className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                aria-label="Add event"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-1.5">
              {dayEvents.length === 0 && <p className="text-[12px] text-muted-foreground/70">No events</p>}
              {dayEvents.map((e) => (
                <button
                  key={e.id}
                  onClick={() => onEventClick(e)}
                  className={cn(
                    "flex w-full flex-col items-start rounded-lg border px-2 py-1.5 text-left transition-colors hover:border-border-strong",
                    e.aiGenerated ? "border-accent/30 bg-accent-soft/40" : "border-border bg-muted/50"
                  )}
                >
                  <span className="flex w-full items-center gap-1 truncate text-[12px] font-medium text-foreground">
                    {e.source === "google" && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" title="Synced from Google Calendar" />}
                    <span className="truncate">{e.title}</span>
                  </span>
                  <span className="text-[10.5px] text-muted-foreground">{formatTime12(e.startTime)}</span>
                </button>
              ))}
            </div>
            {isToday && <Badge tone="accent" className="mt-2">Today</Badge>}
          </div>
        );
      })}
    </div>
  );
}
