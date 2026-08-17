"use client";

import { CalendarEvent } from "@/lib/types";
import { addDaysISO, cn, eventOccursOn, todayISO } from "@/lib/utils";

function startOfMonthISO(monthISO: string): string {
  return monthISO.slice(0, 8) + "01";
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function MonthGrid({
  monthISO,
  events,
  onDayClick,
}: {
  monthISO: string;
  events: CalendarEvent[];
  onDayClick: (date: string) => void;
}) {
  const first = startOfMonthISO(monthISO);
  const firstDate = new Date(first + "T00:00:00");
  const year = firstDate.getFullYear();
  const month = firstDate.getMonth();
  const totalDays = daysInMonth(year, month);
  const startWeekday = firstDate.getDay(); // 0 = Sunday

  const cells: (string | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: totalDays }, (_, i) => addDaysISO(first, i)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const today = todayISO();

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="grid grid-cols-7 border-b border-border bg-muted/40">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="px-2 py-2 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((date, i) => {
          if (!date) return <div key={i} className="min-h-[92px] border-b border-r border-border bg-muted/10 last:border-r-0" />;
          const dayEvents = events.filter((e) => eventOccursOn(e, date)).sort((a, b) => a.startTime.localeCompare(b.startTime));
          const isToday = date === today;
          const dayNum = Number(date.slice(8, 10));
          return (
            <button
              key={date}
              onClick={() => onDayClick(date)}
              className={cn(
                "min-h-[92px] border-b border-r border-border p-1.5 text-left transition-colors last:border-r-0 hover:bg-muted/40",
                (i + 1) % 7 === 0 && "border-r-0"
              )}
            >
              <span
                className={cn(
                  "inline-flex h-5 w-5 items-center justify-center rounded-full text-[12px] font-medium",
                  isToday ? "bg-accent text-accent-foreground" : "text-foreground"
                )}
              >
                {dayNum}
              </span>
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 2).map((e) => (
                  <p key={e.id} className="truncate rounded bg-muted px-1 py-0.5 text-[10.5px] font-medium text-foreground">
                    {e.title}
                  </p>
                ))}
                {dayEvents.length > 2 && <p className="px-1 text-[10px] text-muted-foreground">+{dayEvents.length - 2} more</p>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
