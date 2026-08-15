"use client";

import { useState } from "react";
import { Plus, Repeat, Trash2, Check, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FadeIn } from "@/components/ui/FadeIn";
import { useAlxioum } from "@/lib/store";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40";

const FREQUENCIES = ["daily", "weekdays", "weekly", "custom"];

export default function RoutinesPage() {
  const routines = useAlxioum((s) => s.routines);
  const routineSteps = useAlxioum((s) => s.routineSteps);
  const addRoutine = useAlxioum((s) => s.addRoutine);
  const deleteRoutine = useAlxioum((s) => s.deleteRoutine);
  const addRoutineStep = useAlxioum((s) => s.addRoutineStep);
  const toggleRoutineStep = useAlxioum((s) => s.toggleRoutineStep);
  const deleteRoutineStep = useAlxioum((s) => s.deleteRoutineStep);
  const moveRoutineStep = useAlxioum((s) => s.moveRoutineStep);

  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [busy, setBusy] = useState(false);
  const [stepDrafts, setStepDrafts] = useState<Record<string, string>>({});

  async function submitRoutine(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    await addRoutine({ name: name.trim(), frequency });
    setName("");
    setFrequency("daily");
    setBusy(false);
  }

  async function submitStep(routineId: string) {
    const title = (stepDrafts[routineId] ?? "").trim();
    if (!title) return;
    await addRoutineStep({ routineId, title });
    setStepDrafts((d) => ({ ...d, [routineId]: "" }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-[24px] font-medium tracking-tight text-foreground">Routines</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{routines.length ? `${routines.length} set up` : "Build one below"}</p>
      </div>

      <form onSubmit={submitRoutine} className="flex flex-wrap gap-2 rounded-xl border border-border bg-surface p-3">
        <input className={`${inputClass} flex-1 min-w-[200px]`} placeholder="e.g. Morning routine" value={name} onChange={(e) => setName(e.target.value)} />
        <select className={`${inputClass} w-36`} value={frequency} onChange={(e) => setFrequency(e.target.value)}>
          {FREQUENCIES.map((f) => (
            <option key={f} value={f}>
              {f[0].toUpperCase() + f.slice(1)}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={!name.trim() || busy}>
          <Plus className="h-4 w-4" /> New routine
        </Button>
      </form>

      {routines.length === 0 ? (
        <EmptyState icon={Repeat} title="No routines yet" body="Add one above, or ask Alxioum in Chat — e.g. 'create a 30-minute morning routine' — and I'll suggest steps." />
      ) : (
        <div className="space-y-4">
          {routines.map((routine, i) => {
            const steps = routineSteps.filter((s) => s.routineId === routine.id).sort((a, b) => a.sortOrder - b.sortOrder);
            return (
              <FadeIn key={routine.id} index={i}>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <h2 className="text-[15px] font-semibold text-foreground">{routine.name}</h2>
                        <Badge tone="accent">{routine.frequency}</Badge>
                      </div>
                      <button onClick={() => deleteRoutine(routine.id)} className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-danger-soft hover:text-danger" aria-label="Delete routine">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-3 space-y-1.5">
                      {steps.map((step, si) => (
                        <div key={step.id} className="flex items-center gap-2 rounded-md px-1 py-1">
                          <button
                            onClick={() => toggleRoutineStep(step.id)}
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${step.done ? "border-accent bg-accent text-accent-foreground" : "border-border"}`}
                          >
                            {step.done && <Check className="h-3 w-3" />}
                          </button>
                          {step.timeLabel && <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{step.timeLabel}</span>}
                          <span className={`min-w-0 flex-1 text-[13px] ${step.done ? "text-muted-foreground line-through" : "text-foreground"}`}>{step.title}</span>
                          <button onClick={() => moveRoutineStep(step.id, "up")} disabled={si === 0} className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30">
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => moveRoutineStep(step.id, "down")} disabled={si === steps.length - 1} className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30">
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => deleteRoutineStep(step.id)} className="rounded p-1 text-muted-foreground hover:bg-danger-soft hover:text-danger">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        submitStep(routine.id);
                      }}
                      className="mt-3 flex gap-2"
                    >
                      <input
                        className={`${inputClass} flex-1`}
                        placeholder="Add a step…"
                        value={stepDrafts[routine.id] ?? ""}
                        onChange={(e) => setStepDrafts((d) => ({ ...d, [routine.id]: e.target.value }))}
                      />
                      <Button type="submit" variant="secondary" size="sm" disabled={!(stepDrafts[routine.id] ?? "").trim()}>
                        <Plus className="h-3.5 w-3.5" /> Step
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </FadeIn>
            );
          })}
        </div>
      )}
    </div>
  );
}
