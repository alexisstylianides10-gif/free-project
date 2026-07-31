"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, ChevronDown, Clock, Sparkles } from "lucide-react";
import { Task } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { PriorityDot } from "@/components/ui/PriorityDot";
import { useLifeOS } from "@/lib/store";
import { cn, formatDayLabel } from "@/lib/utils";

const categoryLabel: Record<Task["category"], string> = {
  school: "School",
  home: "Home",
  work: "Work",
  health: "Health",
  finance: "Finance",
  social: "Social",
  travel: "Travel",
  personal: "Personal",
};

export function TaskRow({ task }: { task: Task }) {
  const [open, setOpen] = useState(false);
  const toggleTask = useLifeOS((s) => s.toggleTask);
  const goals = useLifeOS((s) => s.goals);
  const linkedGoal = task.goalId ? goals.find((g) => g.id === task.goalId) : undefined;

  return (
    <motion.div layout className="rounded-xl border border-border bg-surface">
      <div className="flex items-start gap-3 p-3.5">
        <button
          onClick={() => toggleTask(task.id)}
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
            task.done
              ? "border-success bg-success text-white"
              : "border-border-strong text-transparent hover:border-success"
          )}
          aria-label="Toggle complete"
        >
          <Check className="h-3 w-3" />
        </button>

        <button className="min-w-0 flex-1 text-left" onClick={() => setOpen((o) => !o)}>
          <div className="flex items-center gap-2">
            <PriorityDot priority={task.priority} />
            <p className={cn("truncate text-[14px] font-medium text-foreground", task.done && "text-muted-foreground line-through")}>
              {task.title}
            </p>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge tone="neutral">{categoryLabel[task.category]}</Badge>
            {task.dueDate && (
              <span className="text-[12px] text-muted-foreground">{formatDayLabel(task.dueDate)}</span>
            )}
            {task.estimatedMinutes && (
              <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
                <Clock className="h-3 w-3" /> {task.estimatedMinutes}m
              </span>
            )}
            {linkedGoal && (
              <Badge tone="accent">{linkedGoal.name}</Badge>
            )}
          </div>
        </button>

        <ChevronDown
          onClick={() => setOpen((o) => !o)}
          className={cn("mt-1 h-4 w-4 shrink-0 cursor-pointer text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </div>

      {open && (
        <div className="space-y-2.5 border-t border-border px-3.5 py-3">
          {task.description && <p className="text-[13px] text-muted-foreground">{task.description}</p>}

          {task.aiContext && (
            <div className="flex items-start gap-1.5 rounded-lg bg-accent-soft/50 px-2.5 py-1.5 text-[12.5px] text-accent">
              <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
              {task.aiContext}
            </div>
          )}

          {task.subtasks.length > 0 && (
            <div className="space-y-1">
              {task.subtasks.map((st) => (
                <div key={st.id} className="flex items-center gap-2 text-[13px]">
                  <span className={cn("flex h-3.5 w-3.5 items-center justify-center rounded-full border", st.done ? "border-success bg-success" : "border-border-strong")}>
                    {st.done && <Check className="h-2 w-2 text-white" />}
                  </span>
                  <span className={cn("text-foreground", st.done && "text-muted-foreground line-through")}>{st.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
