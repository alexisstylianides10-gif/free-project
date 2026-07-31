"use client";

import { Repeat } from "lucide-react";
import { useLifeOS } from "@/lib/store";
import { EmptyState } from "@/components/ui/EmptyState";
import { HabitRow } from "@/components/domain/HabitRow";
import { todayISO } from "@/lib/utils";

export default function HabitsPage() {
  const habits = useLifeOS((s) => s.habits);
  const today = todayISO();
  const doneToday = habits.filter((h) => h.history[today]).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight text-foreground">Habits</h1>
        <p className="text-[13.5px] text-muted-foreground">
          {habits.length > 0 ? `${doneToday}/${habits.length} done today` : "Small routines LifeOS keeps in view."}
        </p>
      </div>

      {habits.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="No habits yet"
          body="Add a habit like drinking water, reading, or studying — LifeOS will track consistency and notice patterns over time."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {habits.map((h) => (
            <HabitRow key={h.id} habit={h} />
          ))}
        </div>
      )}
    </div>
  );
}
