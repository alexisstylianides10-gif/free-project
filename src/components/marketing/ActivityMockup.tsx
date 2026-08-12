import { CheckCircle2 } from "lucide-react";

const ENTRIES = [
  { title: "Moved event", detail: '"Dentist" → Friday, 4:00 PM', time: "2m ago" },
  { title: "Created task", detail: '"Call the dentist" — high priority', time: "1h ago" },
  { title: "Saved memory", detail: "Prefers morning meetings", time: "Yesterday" },
];

export function ActivityMockup() {
  return (
    <div className="space-y-2.5 rounded-2xl border border-border bg-surface p-5 shadow-card">
      {ENTRIES.map((e) => (
        <div key={e.title + e.time} className="flex items-start gap-2.5 rounded-xl border border-border p-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] font-medium text-foreground">{e.title}</p>
              <span className="shrink-0 rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success">SUCCESS</span>
            </div>
            <p className="mt-0.5 text-[12px] text-muted-foreground">{e.detail}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground/70">{e.time}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
