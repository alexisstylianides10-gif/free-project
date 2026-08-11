"use client";

import { useMemo } from "react";
import { Plus, Target } from "lucide-react";
import { useAlxioum } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { GoalCard } from "@/components/domain/GoalCard";

export default function GoalsPage() {
  const allGoals = useAlxioum((s) => s.goals);
  const openQuickAdd = useAlxioum((s) => s.openQuickAdd);
  const goals = useMemo(() => allGoals.filter((g) => !g.archived), [allGoals]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-foreground">Goals</h1>
          <p className="text-[13.5px] text-muted-foreground">Goal → Plan → Actions → Progress.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => openQuickAdd("goal")}>
          <Plus className="h-4 w-4" /> Create goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No active goals yet"
          body="Create a goal and Alxioum will connect it to your tasks, habits, and calendar automatically."
          action={
            <Button size="sm" onClick={() => openQuickAdd("goal")}>
              Create your first goal
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g} />
          ))}
        </div>
      )}
    </div>
  );
}
