"use client";

import { useEffect, useState } from "react";
import { NotebookPen, Trash2, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FadeIn } from "@/components/ui/FadeIn";
import { useAlxioum } from "@/lib/store";
import * as db from "@/lib/db";
import { StudyNote } from "@/lib/types";
import { formatDayLabel } from "@/lib/utils";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40";

export default function StudyNotesPage() {
  const authUserId = useAlxioum((s) => s.authUserId);
  const getAccessToken = useAlxioum((s) => s.getAccessToken);
  const subjects = useAlxioum((s) => s.subjects);

  const [notes, setNotes] = useState<StudyNote[] | null>(null);
  const [topic, setTopic] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authUserId) return;
    db.fetchStudyNotes(authUserId).then(setNotes).catch(() => setNotes([]));
  }, [authUserId]);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim() || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Your session expired. Please sign in again.");
      const res = await fetch("/api/study/notes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ topic: topic.trim(), subjectId: subjectId || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't generate notes.");
      setNotes((n) => [json.note as StudyNote, ...(n ?? [])]);
      setExpanded((s) => new Set(s).add(json.note.id));
      setTopic("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't generate notes.");
    } finally {
      setGenerating(false);
    }
  }

  async function remove(note: StudyNote) {
    const previous = notes;
    setNotes((n) => n?.filter((x) => x.id !== note.id) ?? null);
    try {
      await db.deleteStudyNoteRow(note.id);
    } catch {
      setNotes(previous);
      setError("Couldn't delete that note — try again.");
    }
  }

  function toggle(id: string) {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <p className="text-[13px] text-muted-foreground">Give Alxioum a topic or paste some material — it&apos;ll turn it into clean, revision-ready notes.</p>

      <form onSubmit={generate} className="space-y-2 rounded-xl border border-border bg-surface p-3">
        <textarea
          className={`${inputClass} min-h-[90px] resize-y`}
          placeholder="e.g. 'Photosynthesis' or paste your class notes / textbook excerpt…"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          {subjects.length > 0 && (
            <select className={`${inputClass} w-44`} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">No subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.icon} {s.name}
                </option>
              ))}
            </select>
          )}
          <Button type="submit" disabled={!topic.trim() || generating} className="ml-auto">
            <Sparkles className="h-4 w-4" /> {generating ? "Generating…" : "Generate notes"}
          </Button>
        </div>
      </form>
      {error && <p className="text-[12px] text-danger">{error}</p>}

      {notes === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : notes.length === 0 ? (
        <EmptyState icon={NotebookPen} title="No notes yet" body="Generate your first set of notes above." />
      ) : (
        <div className="space-y-2">
          {notes.map((note, i) => {
            const subject = subjects.find((s) => s.id === note.subjectId);
            const isOpen = expanded.has(note.id);
            return (
              <FadeIn key={note.id} index={i}>
                <Card>
                  <CardContent className="p-4">
                    <button onClick={() => toggle(note.id)} className="flex w-full items-start justify-between gap-3 text-left">
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-medium text-foreground">{note.title}</p>
                        <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-muted-foreground">
                          {subject && <span>{subject.icon} {subject.name} ·</span>}
                          <span>{formatDayLabel(note.createdAt.slice(0, 10))}</span>
                        </div>
                      </div>
                      {isOpen ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
                    </button>
                    {isOpen && (
                      <>
                        <p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">{note.content}</p>
                        <button onClick={() => remove(note)} className="mt-3 flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-danger">
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </>
                    )}
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
