import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatDayLabel } from "@/lib/utils";
import { GOAL_STATUS_META } from "@/lib/goals/ui";
import type { GoalProgressCardData } from "@/lib/ai/cards";

export function GoalProgressCard({ goals }: { goals: GoalProgressCardData[] }) {
  return (
    <div className="mt-2 space-y-2">
      {goals.map((g) => {
        const meta = GOAL_STATUS_META[g.status];
        const StatusIcon = meta.icon;
        return (
          <Card key={g.id} className="max-w-sm">
            <CardContent className="space-y-2.5 p-4">
              <div className="flex items-center gap-2">
                <span className="text-[16px]">{g.icon}</span>
                <p className="text-[13.5px] font-semibold uppercase tracking-wide text-foreground">{g.name}</p>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-[20px] font-semibold tabular-nums text-foreground">{g.progressPct}%</span>
                <Badge tone={meta.tone}>
                  <StatusIcon className="h-3 w-3" /> {meta.label}
                </Badge>
              </div>
              <ProgressBar value={g.progressPct} />
              {g.nextMilestone && <p className="text-[12.5px] text-muted-foreground">Next milestone: {g.nextMilestone}</p>}
              {g.targetDate && <p className="text-[12px] text-muted-foreground">Target: {formatDayLabel(g.targetDate)}</p>}
              <Link href="/app/goals" className="inline-block text-[12px] font-medium text-accent hover:opacity-80">
                Open Goal
              </Link>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
