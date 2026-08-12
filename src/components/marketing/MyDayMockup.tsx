import { CalendarClock, Clock, ListChecks } from "lucide-react";

export function MyDayMockup() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-card">
      <p className="text-[13.5px] font-semibold text-foreground">Good afternoon, Alex.</p>
      <p className="mt-0.5 text-[12.5px] text-muted-foreground">Thursday, August 13</p>

      <div className="mt-4 space-y-3">
        <div className="rounded-xl border border-border p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-foreground">
            <CalendarClock className="h-3.5 w-3.5 text-accent" /> Today
          </div>
          <div className="flex items-center justify-between text-[12.5px]">
            <span className="text-foreground">Tennis</span>
            <span className="text-muted-foreground">6:00 PM</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[12.5px]">
            <span className="text-foreground">Dinner with Sarah</span>
            <span className="text-muted-foreground">8:30 PM</span>
          </div>
        </div>

        <div className="rounded-xl border border-border p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-foreground">
            <Clock className="h-3.5 w-3.5 text-accent" /> Free time
          </div>
          <span className="inline-flex items-center rounded-full bg-accent-soft px-2.5 py-1 text-[11.5px] font-medium text-accent">4:00–6:00 PM (2h)</span>
        </div>

        <div className="rounded-xl border border-border p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-foreground">
            <ListChecks className="h-3.5 w-3.5 text-accent" /> Tasks
          </div>
          <div className="flex items-center justify-between text-[12.5px]">
            <span className="text-foreground">Finish project outline</span>
            <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[10.5px] font-medium text-warning">high</span>
          </div>
        </div>
      </div>
    </div>
  );
}
