"use client";

import { Check, Flame, Sparkles } from "lucide-react";
import { Habit } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { useLifeOS } from "@/lib/store";
import { addDaysISO, cn, todayISO } from "@/lib/utils";

function currentStreak(habit: Habit, today: string): number {
  let streak = 0;
  let cursor = today;
  while (habit.history[cursor]) {
    streak += 1;
    cursor = addDaysISO(cursor, -1);
  }
  return streak;
}

export function HabitRow({ habit }: { habit: Habit }) {
  const toggleHabit = useLifeOS((s) => s.toggleHabit);
  const today = todayISO();
  const doneToday = !!habit.history[today];
  const streak = currentStreak(habit, today);

  const last7 = Array.from({ length: 7 }, (_, i) => addDaysISO(today, -6 + i));
  const last28 = Array.from({ length: 28 }, (_, i) => addDaysISO(today, -27 + i));
  const weekCount = last7.filter((d) => habit.history[d]).length;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <span className="text-[20px] leading-none">{habit.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium text-foreground">{habit.name}</p>
          <p className="text-[12px] text-muted-foreground">
            {weekCount}/{habit.targetPerWeek} this week
            {streak > 0 && (
              <span className="ml-1.5 inline-flex items-center gap-0.5 text-warning">
                <Flame className="h-3 w-3" /> {streak}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => toggleHabit(habit.id)}
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors",
            doneToday ? "border-success bg-success text-white" : "border-border-strong text-transparent hover:border-success"
          )}
          aria-label="Toggle today"
        >
          <Check className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex gap-1">
        {last7.map((d) => (
          <div
            key={d}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              habit.history[d] ? "bg-success" : "bg-muted"
            )}
          />
        ))}
      </div>

      <div className="mt-3 grid grid-cols-[repeat(14,minmax(0,1fr))] gap-1">
        {last28.map((d) => (
          <div
            key={d}
            className={cn("aspect-square rounded-[3px]", habit.history[d] ? "bg-accent" : "bg-muted")}
            title={d}
          />
        ))}
      </div>

      {habit.aiNote && (
        <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-accent-soft/50 px-2.5 py-1.5">
          <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
          <p className="text-[12.5px] text-accent">{habit.aiNote}</p>
        </div>
      )}
    </Card>
  );
}
