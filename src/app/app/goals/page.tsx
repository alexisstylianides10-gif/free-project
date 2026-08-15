"use client";

import { useState } from "react";
import { Plus, Target, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FadeIn } from "@/components/ui/FadeIn";
import { useAlxioum } from "@/lib/store";
import { formatDayLabel } from "@/lib/utils";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40";

export default function GoalsPage() {
  const goals = useAlxioum((s) => s.goals);
  const goalMilestones = useAlxioum((s) => s.goalMilestones);
  const addGoal = useAlxioum((s) => s.addGoal);
  const deleteGoal = useAlxioum((s) => s.deleteGoal);
  const toggleMilestone = useAlxioum((s) => s.toggleMilestone);

  const [name, setName] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    await addGoal({ name: name.trim(), targetDate: targetDate || undefined });
    setName("");
    setTargetDate("");
    setBusy(false);
  }

  const active = goals.filter((g) => !g.completed);
  const completed = goals.filter((g) => g.completed);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-[24px] font-medium tracking-tight text-foreground">Goals</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{active.length ? `${active.length} in progress` : "Nothing set yet"}</p>
      </div>

      <form onSubmit={submit} className="flex flex-wrap gap-2 rounded-xl border border-border bg-surface p-3">
        <input className={`${inputClass} flex-1 min-w-[220px]`} placeholder="I want to…" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={`${inputClass} w-40`} type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        <Button type="submit" disabled={!name.trim() || busy}>
          <Plus className="h-4 w-4" /> Add goal
        </Button>
      </form>

      {goals.length === 0 ? (
        <EmptyState icon={Target} title="No goals yet" body="Add one above, or ask Alxioum in Chat — e.g. 'I want to learn Spanish' — and I'll break it into milestones." />
      ) : (
        <div className="space-y-4">
          {active.map((goal, i) => {
            const milestones = goalMilestones.filter((m) => m.goalId === goal.id).sort((a, b) => a.sortOrder - b.sortOrder);
            const doneCount = milestones.filter((m) => m.done).length;
            const nextMilestone = milestones.find((m) => !m.done);
            return (
              <FadeIn key={goal.id} index={i}>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-[15px] font-semibold text-foreground">{goal.name}</h2>
                        {goal.targetDate && <p className="mt-0.5 text-[12px] text-muted-foreground">Target {formatDayLabel(goal.targetDate)}</p>}
                      </div>
                      <button onClick={() => deleteGoal(goal.id)} className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-danger-soft hover:text-danger" aria-label="Delete goal">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${goal.progress}%` }} />
                      </div>
                      <span className="shrink-0 text-[12px] font-medium text-muted-foreground">{goal.progress}%</span>
                    </div>

                    {milestones.length > 0 && (
                      <div className="mt-4 space-y-1.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {doneCount} / {milestones.length} milestones
                        </p>
                        {milestones.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => toggleMilestone(m.id)}
                            className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left hover:bg-muted/60"
                          >
                            <span
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${m.done ? "border-accent bg-accent text-accent-foreground" : "border-border"}`}
                            >
                              {m.done && <Check className="h-3 w-3" />}
                            </span>
                            <span className={`text-[13px] ${m.done ? "text-muted-foreground line-through" : "text-foreground"}`}>{m.title}</span>
                          </button>
                        ))}
                        {nextMilestone && <p className="pt-1 text-[11px] text-muted-foreground">Next: {nextMilestone.title}</p>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </FadeIn>
            );
          })}

          {completed.length > 0 && (
            <div className="space-y-2 pt-2">
              <h2 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Completed · {completed.length}</h2>
              {completed.map((goal) => (
                <Card key={goal.id}>
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <p className="text-[13.5px] text-muted-foreground line-through">{goal.name}</p>
                    <button onClick={() => deleteGoal(goal.id)} className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-danger-soft hover:text-danger" aria-label="Delete goal">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
