"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Clock, Sparkles } from "lucide-react";
import { Task } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { PriorityDot } from "@/components/ui/PriorityDot";
import { useAlxioum } from "@/lib/store";
import { cn, formatDayLabel } from "@/lib/utils";

const categoryLabel: Record<Task["category"], string> = {
  school: "School",
  home: "Home",
  work: "Work",
  health: "Health",
  social: "Social",
  travel: "Travel",
  personal: "Personal",
};

const BURST_ANGLES = [0, 60, 120, 180, 240, 300];

export function TaskRow({ task }: { task: Task }) {
  const [open, setOpen] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const toggleTask = useAlxioum((s) => s.toggleTask);

  function handleToggle() {
    if (!task.done) setCelebrate(true);
    toggleTask(task.id);
  }

  return (
    <motion.div layout className="rounded-xl border border-border bg-surface">
      <div className="flex items-start gap-3 p-3.5">
        <button
          onClick={handleToggle}
          className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center"
          aria-label="Toggle complete"
        >
          <AnimatePresence>
            {celebrate &&
              BURST_ANGLES.map((angle) => (
                <motion.span
                  key={angle}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{ x: Math.cos((angle * Math.PI) / 180) * 16, y: Math.sin((angle * Math.PI) / 180) * 16, opacity: 0, scale: 0 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  onAnimationComplete={() => setCelebrate(false)}
                  className="pointer-events-none absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-success"
                />
              ))}
          </AnimatePresence>
          <motion.span
            animate={{ scale: task.done ? [1, 1.3, 1] : 1 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full border transition-colors",
              task.done ? "border-success bg-success text-white" : "border-border-strong text-transparent hover:border-success"
            )}
          >
            <Check className="h-3 w-3" />
          </motion.span>
        </button>

        <button className="min-w-0 flex-1 text-left" onClick={() => setOpen((o) => !o)}>
          <div className="flex min-w-0 items-center gap-2">
            <PriorityDot priority={task.priority} />
            <p className={cn("min-w-0 flex-1 truncate text-[14px] font-medium text-foreground", task.done && "text-muted-foreground line-through")}>{task.title}</p>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge tone="neutral">{categoryLabel[task.category]}</Badge>
            {task.dueDate && <span className="text-[12px] text-muted-foreground">{formatDayLabel(task.dueDate)}</span>}
            {task.estimatedMinutes && (
              <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
                <Clock className="h-3 w-3" /> {task.estimatedMinutes}m
              </span>
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
