import Link from "next/link";
import { CheckSquare, Square } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { formatDayLabel } from "@/lib/utils";
import type { TaskCardData } from "@/lib/ai/cards";

export function TaskListCard({ tasks, heading }: { tasks: TaskCardData[]; heading?: string }) {
  const unfinished = tasks.filter((t) => !t.done).length;

  return (
    <Card className="mt-2 max-w-sm">
      <CardContent className="space-y-2.5 p-4">
        {heading && <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{heading}</p>}
        <div className="space-y-1.5">
          {tasks.map((t) => (
            <div key={t.id} className="flex items-center gap-2 text-[13px]">
              {t.done ? <CheckSquare className="h-3.5 w-3.5 shrink-0 text-success" /> : <Square className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
              <span className={t.done ? "text-muted-foreground line-through" : "text-foreground"}>{t.title}</span>
              {t.dueDate && !t.done && <span className="text-[11px] text-muted-foreground">· {formatDayLabel(t.dueDate)}</span>}
            </div>
          ))}
        </div>
        {tasks.length > 1 && (
          <p className="text-[12px] text-muted-foreground">
            You have {unfinished} unfinished task{unfinished === 1 ? "" : "s"}.
          </p>
        )}
        <Link href="/app/tasks" className="inline-block text-[12px] font-medium text-accent hover:opacity-80">
          View Tasks
        </Link>
      </CardContent>
    </Card>
  );
}
