import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ProgressBar } from "@/components/ui/ProgressBar";

export function StatTile({
  label,
  value,
  tone = "brand",
  suffix,
}: {
  label: string;
  value: number;
  tone?: "school" | "future" | "brand";
  suffix?: ReactNode;
}) {
  return (
    <div className="flex-1">
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        {suffix}
      </div>
      <p className="mt-1 text-lg font-bold tabular-nums text-foreground">{value}%</p>
      <ProgressBar value={value} tone={tone} className="mt-2 h-1.5" />
    </div>
  );
}

export function StreakStat({ days }: { days: number }) {
  return (
    <div className="flex-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Streak</p>
      <p className={cn("mt-1 flex items-center gap-1 text-lg font-bold text-foreground")}>
        <span aria-hidden>🔥</span>
        {days}
        <span className="text-xs font-medium text-muted-foreground">days</span>
      </p>
    </div>
  );
}
