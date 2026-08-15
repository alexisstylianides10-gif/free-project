"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Pause, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { subjectColorway } from "@/lib/study/colors";
import { cn } from "@/lib/utils";

const RADIUS = 100;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const BURST_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

export interface FocusLinkOption {
  id: string;
  label: string;
  icon?: string;
  color?: string;
}

export interface FocusTimerProps {
  linkOptions: FocusLinkOption[];
  linkFieldLabel: string;
  durations?: number[];
  onStart: (linkId: string | undefined, plannedMinutes: number) => Promise<{ id: string } | null>;
  onComplete: (sessionId: string, actualMinutes: number) => void;
  /** An already-running session to resume on mount (e.g. one started via chat). */
  resumeSession?: { id: string; plannedMinutes: number; startedAt: string; linkId?: string };
}

/** Circular countdown timer shared by the Student-only Study Focus page (subject-linked) and the general Focus page (task-linked, all plans) — same table, same UI, different link kind. */
export function FocusTimer({ linkOptions, linkFieldLabel, durations = [15, 25, 45, 60], onStart, onComplete, resumeSession }: FocusTimerProps) {
  const resumeInitialRemaining = resumeSession
    ? Math.max(0, resumeSession.plannedMinutes * 60 - Math.floor((Date.now() - new Date(resumeSession.startedAt).getTime()) / 1000))
    : null;

  const [plannedMinutes, setPlannedMinutes] = useState(resumeSession?.plannedMinutes ?? durations[1] ?? durations[0]);
  const [linkId, setLinkId] = useState<string | undefined>(resumeSession?.linkId);
  const [sessionId, setSessionId] = useState<string | null>(resumeSession?.id ?? null);
  const [remainingSeconds, setRemainingSeconds] = useState(resumeInitialRemaining ?? plannedMinutes * 60);
  const [running, setRunning] = useState(resumeInitialRemaining !== null && resumeInitialRemaining > 0);
  const [celebrate, setCelebrate] = useState(false);
  const startedAtRef = useRef<number | null>(resumeSession ? new Date(resumeSession.startedAt).getTime() : null);
  const totalSecondsRef = useRef(resumeSession ? resumeSession.plannedMinutes * 60 : plannedMinutes * 60);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setRemainingSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [running]);

  useEffect(() => {
    if (running && remainingSeconds === 0 && sessionId) {
      onComplete(sessionId, plannedMinutes);
      setRunning(false);
      setCelebrate(true);
      setSessionId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSeconds]);

  async function handleStart() {
    const created = await onStart(linkId, plannedMinutes);
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
    onComplete(sessionId, Math.min(elapsedMinutes, plannedMinutes));
    setRunning(false);
    setSessionId(null);
    setRemainingSeconds(plannedMinutes * 60);
  }

  const idle = !sessionId && !celebrate;
  const progress = 1 - remainingSeconds / totalSecondsRef.current;
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const mm = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");
  const ss = String(remainingSeconds % 60).padStart(2, "0");
  const activeLink = linkOptions.find((o) => o.id === linkId);
  const colorway = subjectColorway(activeLink?.color ?? "violet");

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
              {durations.map((d) => (
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

          {linkOptions.length > 0 && (
            <div>
              <p className="mb-2 text-[13px] font-semibold text-foreground">{linkFieldLabel}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setLinkId(undefined)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                    !linkId ? "border-accent bg-accent-soft text-accent" : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  None
                </button>
                {linkOptions.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setLinkId(o.id)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                      linkId === o.id ? "border-accent bg-accent-soft text-accent" : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {o.icon ? `${o.icon} ` : ""}
                    {o.label}
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
            {activeLink && <span className="mt-1 text-[12.5px] text-muted-foreground">{activeLink.label}</span>}
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
