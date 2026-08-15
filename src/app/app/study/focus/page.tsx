"use client";

import { useAlxioum } from "@/lib/store";
import { FocusTimer } from "@/components/domain/FocusTimer";

export default function FocusModePage() {
  const subjects = useAlxioum((s) => s.subjects);
  const startFocusSession = useAlxioum((s) => s.startFocusSession);
  const completeFocusSession = useAlxioum((s) => s.completeFocusSession);

  return (
    <FocusTimer
      linkOptions={subjects.map((s) => ({ id: s.id, label: s.name, icon: s.icon, color: s.color }))}
      linkFieldLabel="Subject (optional)"
      onStart={async (subjectId, plannedMinutes) => startFocusSession({ subjectId, plannedMinutes })}
      onComplete={completeFocusSession}
    />
  );
}
