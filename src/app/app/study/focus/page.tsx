"use client";

import { useMemo } from "react";
import { useAlxioum } from "@/lib/store";
import { FocusTimer } from "@/components/domain/FocusTimer";

export default function FocusModePage() {
  const subjects = useAlxioum((s) => s.subjects);
  const focusSessions = useAlxioum((s) => s.focusSessions);
  const startFocusSession = useAlxioum((s) => s.startFocusSession);
  const completeFocusSession = useAlxioum((s) => s.completeFocusSession);

  // A session started elsewhere (e.g. via Chat's focus_start tool) that this
  // page hasn't shown a timer for yet — resume it in place. Without this,
  // navigating away and back silently drops the running timer while the
  // underlying focus_sessions row stays open forever. Only subject-linked
  // sessions belong here; task-linked ones stay on the general Focus page.
  // Landing directly on the running timer (instead of the idle "Start"
  // screen) also prevents starting a second, concurrent session.
  const resumable = useMemo(() => {
    const now = Date.now();
    const candidate = focusSessions.find((s) => !s.completedAt && s.subjectId);
    if (!candidate) return undefined;
    const elapsedMs = now - new Date(candidate.startedAt).getTime();
    if (elapsedMs > candidate.plannedMinutes * 60 * 1000 + 5 * 60 * 1000) return undefined;
    return { id: candidate.id, plannedMinutes: candidate.plannedMinutes, startedAt: candidate.startedAt, linkId: candidate.subjectId };
  }, [focusSessions]);

  return (
    <FocusTimer
      linkOptions={subjects.map((s) => ({ id: s.id, label: s.name, icon: s.icon, color: s.color }))}
      linkFieldLabel="Subject (optional)"
      resumeSession={resumable}
      onStart={async (subjectId, plannedMinutes) => startFocusSession({ subjectId, plannedMinutes })}
      onComplete={completeFocusSession}
    />
  );
}
