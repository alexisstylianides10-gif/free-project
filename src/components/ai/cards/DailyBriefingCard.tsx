import { Calendar, CheckSquare, Target, FileWarning, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import type { DailyBriefingCardData } from "@/lib/ai/cards";

export function DailyBriefingCard({ briefing }: { briefing: DailyBriefingCardData }) {
  const stats = [
    { icon: Calendar, label: "Calendar", value: `${briefing.eventsCount} event${briefing.eventsCount === 1 ? "" : "s"}` },
    { icon: CheckSquare, label: "Tasks", value: `${briefing.tasksRemaining} remaining` },
    { icon: Target, label: "Goals", value: `${briefing.goalsPriorityCount} priority` },
    { icon: FileWarning, label: "Deadlines", value: `${briefing.deadlinesUpcoming} upcoming` },
  ];

  return (
    <Card className="mt-2 max-w-sm">
      <CardContent className="space-y-3 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Today</p>
        <div className="grid grid-cols-2 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center gap-2 text-[12.5px]">
              <s.icon className="h-3.5 w-3.5 shrink-0 text-accent" />
              <div>
                <p className="text-foreground">{s.value}</p>
                <p className="text-[10.5px] text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
        {briefing.recommendedFocus && (
          <div className="flex items-start gap-2 rounded-lg bg-accent-soft/50 p-2.5 text-[12.5px]">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
            <p className="text-foreground">
              Recommended focus: <span className="font-medium">{briefing.recommendedFocus}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
