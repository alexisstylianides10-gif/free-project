"use client";

import { useMemo, useState } from "react";
import { Plus, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { TaskRow } from "@/components/domain/TaskRow";
import { FadeIn } from "@/components/ui/FadeIn";
import { useAlxioum } from "@/lib/store";
import { Priority } from "@/lib/types";
import { daysBetween, todayISO } from "@/lib/utils";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40";

export default function TasksPage() {
  const tasks = useAlxioum((s) => s.tasks);
  const addTask = useAlxioum((s) => s.addTask);

  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [busy, setBusy] = useState(false);
  const [showDone, setShowDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    await addTask({ title: title.trim(), dueDate: dueDate || undefined, priority });
    setTitle("");
    setDueDate("");
    setPriority("medium");
    setBusy(false);
  }

  const today = todayISO();
  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  const overdue = open.filter((t) => t.dueDate && daysBetween(today, t.dueDate) < 0);
  const dueToday = open.filter((t) => t.dueDate && daysBetween(today, t.dueDate) === 0);
  const upcoming = open.filter((t) => t.dueDate && daysBetween(today, t.dueDate) > 0).sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));
  const noDate = open.filter((t) => !t.dueDate);

  const groups = useMemo(
    () => [
      { label: "Overdue", items: overdue },
      { label: "Due today", items: dueToday },
      { label: "Upcoming", items: upcoming },
      { label: "No due date", items: noDate },
    ],
    [overdue, dueToday, upcoming, noDate]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground">Tasks</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{open.length ? `${open.length} open` : "Nothing outstanding"}</p>
      </div>

      <form onSubmit={submit} className="flex flex-wrap gap-2 rounded-xl border border-border bg-surface p-3">
        <input className={`${inputClass} flex-1 min-w-[200px]`} placeholder="Add a task…" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className={`${inputClass} w-40`} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <select className={`${inputClass} w-32`} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <Button type="submit" disabled={!title.trim() || busy}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </form>

      {open.length === 0 && done.length === 0 ? (
        <EmptyState icon={CheckSquare} title="No tasks yet" body="Add one above, or ask Alxioum in Chat — e.g. 'remind me to call the dentist tomorrow.'" />
      ) : (
        <div className="space-y-6">
          {groups.map(
            (g) =>
              g.items.length > 0 && (
                <div key={g.label} className="space-y-2">
                  <h2 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {g.label} · {g.items.length}
                  </h2>
                  <div className="space-y-2">
                    {g.items.map((t, i) => (
                      <FadeIn key={t.id} index={i}>
                        <TaskRow task={t} />
                      </FadeIn>
                    ))}
                  </div>
                </div>
              )
          )}

          {done.length > 0 && (
            <div className="space-y-2">
              <button onClick={() => setShowDone((v) => !v)} className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground">
                {showDone ? "Hide" : "Show"} completed · {done.length}
              </button>
              {showDone && (
                <div className="space-y-2">
                  {done.map((t) => (
                    <TaskRow key={t.id} task={t} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
