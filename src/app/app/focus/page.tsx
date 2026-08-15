"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useAlxioum } from "@/lib/store";
import { FocusTimer } from "@/components/domain/FocusTimer";

export default function GeneralFocusPage() {
  const tasks = useAlxioum((s) => s.tasks);
  const focusSessions = useAlxioum((s) => s.focusSessions);
  const startFocusSession = useAlxioum((s) => s.startFocusSession);
  const completeFocusSession = useAlxioum((s) => s.completeFocusSession);
  const searchParams = useSearchParams();

  const openTasks = tasks.filter((t) => !t.done);

  // A session started elsewhere (e.g. via Chat's focus_start tool) that this
  // page hasn't shown a timer for yet — resume it in place rather than
  // silently ignoring it. Only sessions without a subject belong to this
  // general (all-plans) Focus page; subject-linked sessions stay on the
  // Student-only Study Focus page.
  const resumable = useMemo(() => {
    const now = Date.now();
    const candidate = focusSessions.find((s) => !s.completedAt && !s.subjectId);
    if (!candidate) return undefined;
    const elapsedMs = now - new Date(candidate.startedAt).getTime();
    if (elapsedMs > candidate.plannedMinutes * 60 * 1000 + 5 * 60 * 1000) return undefined;
    return { id: candidate.id, plannedMinutes: candidate.plannedMinutes, startedAt: candidate.startedAt, linkId: candidate.taskId };
  }, [focusSessions]);

  const prefillMinutes = Number(searchParams.get("minutes"));
  const durations = [15, 25, 45, 60, 90];
  if (prefillMinutes && !durations.includes(prefillMinutes)) durations.push(prefillMinutes);
  durations.sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-[24px] font-medium tracking-tight text-foreground">Focus</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Block out distraction-free time, optionally linked to a task.</p>
      </div>
      <FocusTimer
        linkOptions={openTasks.map((t) => ({ id: t.id, label: t.title }))}
        linkFieldLabel="Task (optional)"
        durations={durations}
        resumeSession={resumable}
        onStart={async (taskId, plannedMinutes) => startFocusSession({ taskId, plannedMinutes })}
        onComplete={completeFocusSession}
      />
    </div>
  );
}
