"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Pause, Play, Square } from "lucide-react";
import { useAlxioum } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { subjectColorway } from "@/lib/study/colors";
import { cn } from "@/lib/utils";

const DURATIONS = [15, 25, 45, 60];
const RADIUS = 100;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const BURST_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

export default function FocusModePage() {
  const subjects = useAlxioum((s) => s.subjects);
  const startFocusSession = useAlxioum((s) => s.startFocusSession);
  const completeFocusSession = useAlxioum((s) => s.completeFocusSession);

  const [plannedMinutes, setPlannedMinutes] = useState(25);
  const [subjectId, setSubjectId] = useState<string | undefined>(undefined);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const startedAtRef = useRef<number | null>(null);
  const totalSecondsRef = useRef(25 * 60);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setRemainingSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [running]);

  useEffect(() => {
    if (running && remainingSeconds === 0 && sessionId) {
      completeFocusSession(sessionId, plannedMinutes);
      setRunning(false);
      setCelebrate(true);
      setSessionId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSeconds]);

  async function handleStart() {
    const created = await startFocusSession({ subjectId, plannedMinutes });
    if (!created) return;
    setSessionId(created.id);
    totalSecondsRef.current = plannedMinutes * 60;
    setRemainingSeconds(plannedMinutes * 60);
    startedAtRef.current = Date.now();
    setRunning(true);
  }

  function handleEndEarly() {
    if (!sessionId || !startedAtRef.current) return;
    const elapsedMinutes = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 60000));
    completeFocusSession(sessionId, Math.min(elapsedMinutes, plannedMinutes));
    setRunning(false);
    setSessionId(null);
    setRemainingSeconds(plannedMinutes * 60);
  }

  const idle = !sessionId && !celebrate;
  const progress = 1 - remainingSeconds / totalSecondsRef.current;
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const mm = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");
  const ss = String(remainingSeconds % 60).padStart(2, "0");
  const colorway = subjectColorway(subjects.find((s) => s.id === subjectId)?.color ?? "violet");

  if (celebrate) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className={cn("relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br text-white", colorway.gradient)}
          >
            <AnimatePresence>
              {BURST_ANGLES.map((angle) => (
                <motion.span
                  key={angle}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{ x: Math.cos((angle * Math.PI) / 180) * 46, y: Math.sin((angle * Math.PI) / 180) * 46, opacity: 0, scale: 0 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className={cn("pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full", colorway.dot)}
                />
              ))}
            </AnimatePresence>
            <Check className="h-7 w-7" />
          </motion.div>
          <p className="text-[16px] font-semibold text-foreground">Session complete</p>
          <p className="text-sm text-muted-foreground">{plannedMinutes} minutes logged. Nice work.</p>
          <Button className="mt-2" onClick={() => setCelebrate(false)}>
            Start another
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (idle) {
    return (
      <Card>
        <CardContent className="space-y-5 p-5">
          <div>
            <p className="mb-2 text-[13px] font-semibold text-foreground">Duration</p>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    setPlannedMinutes(d);
                    setRemainingSeconds(d * 60);
                    totalSecondsRef.current = d * 60;
                  }}
                  className={cn(
                    "rounded-lg border px-3.5 py-2 text-[13px] font-medium transition-colors",
                    plannedMinutes === d ? "border-transparent bg-accent text-accent-foreground" : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {d} min
                </button>
              ))}
            </div>
          </div>

          {subjects.length > 0 && (
            <div>
              <p className="mb-2 text-[13px] font-semibold text-foreground">Subject (optional)</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSubjectId(undefined)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                    !subjectId ? "border-accent bg-accent-soft text-accent" : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  None
                </button>
                {subjects.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSubjectId(s.id)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                      subjectId === s.id ? "border-accent bg-accent-soft text-accent" : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {s.icon} {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button size="lg" className="w-full" onClick={handleStart}>
            <Play className="h-4 w-4" /> Start focus session
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-6 p-8">
        <div className="relative flex h-56 w-56 items-center justify-center">
          <svg width="224" height="224" viewBox="0 0 224 224" className="-rotate-90">
            <circle cx="112" cy="112" r={RADIUS} fill="none" stroke="hsl(var(--muted))" strokeWidth="12" />
            <motion.circle
              cx="112"
              cy="112"
              r={RADIUS}
              fill="none"
              stroke="url(#focus-gradient)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 0.4, ease: "linear" }}
            />
            <defs>
              <linearGradient id="focus-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--accent))" />
                <stop offset="100%" stopColor="hsl(var(--accent-end))" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-[38px] font-semibold tabular-nums tracking-tight text-foreground">
              {mm}:{ss}
            </span>
            {subjectId && <span className="mt-1 text-[12.5px] text-muted-foreground">{subjects.find((s) => s.id === subjectId)?.name}</span>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button size="lg" variant="outline" onClick={() => setRunning((r) => !r)}>
            {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} {running ? "Pause" : "Resume"}
          </Button>
          <Button size="lg" variant="ghost" className="text-danger hover:bg-danger-soft" onClick={handleEndEarly}>
            <Square className="h-4 w-4" /> End session
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
