"use client";

import { useMemo, useRef, useState } from "react";
import { Camera, Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAlxioum } from "@/lib/store";
import { fileToCompressedDataUrl } from "@/lib/image";
import { addDaysISO, formatTime12, nextWeekday, todayISO } from "@/lib/utils";
import { CalendarEvent } from "@/lib/types";

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
type DayKey = (typeof DAY_KEYS)[number];

interface ExtractedLesson {
  subject: string;
  dayOfWeek: DayKey;
  startTime: string;
  endTime: string;
  room?: string;
  teacher?: string;
}

function defaultRepeatUntil(): string {
  return addDaysISO(todayISO(), 16 * 7);
}

export default function SchedulePage() {
  const events = useAlxioum((s) => s.events);
  const addEvent = useAlxioum((s) => s.addEvent);
  const removeEvent = useAlxioum((s) => s.removeEvent);
  const getAccessToken = useAlxioum((s) => s.getAccessToken);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [lessons, setLessons] = useState<ExtractedLesson[] | null>(null);
  const [repeatUntil, setRepeatUntil] = useState(defaultRepeatUntil());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const schedule = useMemo(() => {
    const weekly = events.filter((e) => e.type === "school" && e.recurrence === "weekly");
    const byDay = new Map<number, CalendarEvent[]>();
    for (const e of weekly) {
      const day = new Date(e.date + "T00:00:00").getDay();
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day)!.push(e);
    }
    for (const list of byDay.values()) list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return byDay;
  }, [events]);
  const hasSchedule = schedule.size > 0;

  async function handleFile(file: File) {
    setError(null);
    setNote(null);
    setLessons(null);
    setBusy(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      const [, base64] = dataUrl.split(",");
      const token = await getAccessToken();
      if (!token) throw new Error("Your session expired. Please sign in again.");
      const res = await fetch("/api/study/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ image: { base64, mediaType: "image/jpeg" } }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't read that schedule.");
      setLessons(json.lessons as ExtractedLesson[]);
      setNote(json.note || null);
      setRepeatUntil(defaultRepeatUntil());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read that schedule.");
    } finally {
      setBusy(false);
    }
  }

  function removeLesson(index: number) {
    setLessons((ls) => (ls ? ls.filter((_, i) => i !== index) : ls));
  }

  async function confirmAdd() {
    if (!lessons?.length) return;
    setSaving(true);
    setSaveError(null);
    const failures: string[] = [];
    for (const lesson of lessons) {
      const dayIndex = DAY_KEYS.indexOf(lesson.dayOfWeek);
      if (dayIndex === -1 || lesson.endTime <= lesson.startTime) {
        failures.push(lesson.subject);
        continue;
      }
      const date = nextWeekday(todayISO(), dayIndex, true);
      const created = await addEvent({
        title: lesson.subject,
        date,
        startTime: lesson.startTime,
        endTime: lesson.endTime,
        type: "school",
        location: lesson.room,
        notes: lesson.teacher ? `Teacher: ${lesson.teacher}` : undefined,
        recurrence: "weekly",
        recurrenceUntil: repeatUntil,
      });
      if (!created) failures.push(lesson.subject);
    }
    setSaving(false);
    if (failures.length === lessons.length) {
      setSaveError("Couldn't add those classes right now. Try again shortly.");
      return;
    }
    setLessons(null);
    setNote(null);
    if (failures.length) setSaveError(`Added, but couldn't save: ${failures.join(", ")}.`);
  }

  return (
    <div className="space-y-6">
      <p className="text-[13px] text-muted-foreground">
        Take a photo of your class schedule and Alxioum will add each lesson to your calendar as a weekly recurring event — nothing is added until you confirm.
      </p>

      {!lessons && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-8 text-center transition-colors hover:bg-muted/50"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
          {busy ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-accent" />
              <p className="text-[13.5px] text-muted-foreground">Reading your schedule…</p>
            </>
          ) : (
            <>
              <Camera className="h-5 w-5 text-muted-foreground" />
              <p className="text-[13.5px] font-medium text-foreground">Take or upload a photo of your schedule</p>
            </>
          )}
        </div>
      )}
      {error && <p className="text-[12px] text-danger">{error}</p>}

      {lessons && (
        <div className="space-y-3">
          {note && <p className="text-[12px] text-muted-foreground">{note}</p>}
          <p className="text-[13px] font-semibold text-foreground">
            Found {lessons.length} class{lessons.length === 1 ? "" : "es"} — review before adding
          </p>
          <div className="space-y-1.5">
            {lessons.map((l, i) => (
              <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-border/70 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-foreground">{l.subject}</p>
                  <p className="text-[11.5px] text-muted-foreground">
                    {DAY_LABELS[DAY_KEYS.indexOf(l.dayOfWeek)]} · {formatTime12(l.startTime)}–{formatTime12(l.endTime)}
                    {l.room ? ` · ${l.room}` : ""}
                  </p>
                </div>
                <button onClick={() => removeLesson(i)} className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-danger-soft hover:text-danger" aria-label="Remove">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <label className="block text-[12.5px] text-muted-foreground">
            Repeat weekly until
            <input
              type="date"
              value={repeatUntil}
              onChange={(e) => setRepeatUntil(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </label>

          {saveError && <p className="text-[12px] text-danger">{saveError}</p>}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLessons(null)} className="flex-1 justify-center">
              Cancel
            </Button>
            <Button onClick={confirmAdd} disabled={!lessons.length || saving} className="flex-1 justify-center">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Add {lessons.length} to calendar
            </Button>
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-[13px] font-semibold text-foreground">Your Schedule</p>
        {!hasSchedule ? (
          <p className="text-[12.5px] text-muted-foreground">No recurring classes yet — scan a photo above to add your weekly schedule.</p>
        ) : (
          <div className="space-y-3">
            {DAY_LABELS.map((label, dayIndex) => {
              const dayLessons = schedule.get(dayIndex);
              if (!dayLessons?.length) return null;
              return (
                <Card key={dayIndex}>
                  <CardContent className="p-4">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                    <div className="space-y-1.5">
                      {dayLessons.map((e) => (
                        <div key={e.id} className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium text-foreground">{e.title}</p>
                            <p className="text-[11.5px] text-muted-foreground">
                              {formatTime12(e.startTime)}–{formatTime12(e.endTime)}
                              {e.location ? ` · ${e.location}` : ""}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {e.recurrenceUntil && <Badge tone="neutral">until {e.recurrenceUntil}</Badge>}
                            <button onClick={() => removeEvent(e.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-danger-soft hover:text-danger" aria-label="Remove class">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
