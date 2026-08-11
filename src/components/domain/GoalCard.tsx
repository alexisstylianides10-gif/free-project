"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, ChevronDown, Sparkles, Target } from "lucide-react";
import { Goal } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { useAlxioum } from "@/lib/store";
import { cn, formatDayLabel } from "@/lib/utils";

export function GoalCard({ goal }: { goal: Goal }) {
  const [open, setOpen] = useState(false);
  const tasks = useAlxioum((s) => s.tasks);
  const habits = useAlxioum((s) => s.habits);
  const toggleMilestone = useAlxioum((s) => s.toggleMilestone);

  const linkedTasks = tasks.filter((t) => t.goalId === goal.id);
  const linkedHabits = habits.filter((h) => goal.linkedHabitIds.includes(h.id));
  const doneMilestones = goal.milestones.filter((m) => m.done).length;

  return (
    <Card className="overflow-hidden">
      <button className="w-full p-5 text-left" onClick={() => setOpen((o) => !o)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <Target className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[15.5px] font-semibold text-foreground">{goal.name}</p>
              {goal.deadline && <p className="text-[12.5px] text-muted-foreground">Deadline {formatDayLabel(goal.deadline)}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold text-foreground">{goal.progress}%</span>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
          </div>
        </div>
        <ProgressBar value={goal.progress} className="mt-3" />
      </button>

      {open && (
        <div className="space-y-4 border-t border-border p-5 pt-4">
          {goal.why && (
            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">Why it matters</p>
              <p className="mt-1 text-[13.5px] text-foreground">{goal.why}</p>
            </div>
          )}

          {goal.milestones.length > 0 && (
            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                Milestones · {doneMilestones}/{goal.milestones.length}
              </p>
              <div className="mt-2 space-y-1.5">
                {goal.milestones.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => toggleMilestone(goal.id, m.id)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted"
                  >
                    <span
                      className={cn(
                        "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border",
                        m.done ? "border-success bg-success" : "border-border-strong"
                      )}
                      style={{ height: 18, width: 18 }}
                    >
                      {m.done && <Check className="h-2.5 w-2.5 text-white" />}
                    </span>
                    <span className={cn("text-[13.5px] text-foreground", m.done && "text-muted-foreground line-through")}>{m.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {linkedTasks.length > 0 && (
            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">Linked tasks</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {linkedTasks.map((t) => (
                  <Badge key={t.id} tone={t.done ? "success" : "neutral"}>
                    {t.title}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {linkedHabits.length > 0 && (
            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">Linked habits</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {linkedHabits.map((h) => (
                  <Badge key={h.id}>
                    {h.emoji} {h.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-lg bg-accent-soft/50 p-3">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
              <div>
                <p className="text-[11.5px] font-semibold uppercase tracking-wide text-accent">AI plan</p>
                <p className="mt-0.5 text-[13px] text-foreground">{goal.aiPlan}</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </Card>
  );
}
