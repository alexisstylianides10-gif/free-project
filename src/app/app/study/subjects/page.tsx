"use client";

import { useState } from "react";
import { BookOpen, Plus, Trash2 } from "lucide-react";
import { useAlxioum } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { FadeIn } from "@/components/ui/FadeIn";
import { SUBJECT_COLORS, subjectColorway } from "@/lib/study/colors";
import { cn } from "@/lib/utils";

const ICONS = ["📘", "🧮", "🧪", "🌍", "🎨", "💻", "🎵", "🏛️", "📚", "🔬"];

export default function SubjectsPage() {
  const subjects = useAlxioum((s) => s.subjects);
  const focusSessions = useAlxioum((s) => s.focusSessions);
  const addSubject = useAlxioum((s) => s.addSubject);
  const deleteSubject = useAlxioum((s) => s.deleteSubject);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(ICONS[0]);
  const [color, setColor] = useState(SUBJECT_COLORS[0].key);
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    await addSubject({ name: name.trim(), color, icon });
    setSaving(false);
    setOpen(false);
    setName("");
    setIcon(ICONS[0]);
    setColor(SUBJECT_COLORS[0].key);
  }

  function statsFor(subjectId: string) {
    const sessions = focusSessions.filter((f) => f.subjectId === subjectId && f.completedAt);
    const totalMinutes = sessions.reduce((sum, s) => sum + s.actualMinutes, 0);
    const weekAgo = Date.now() - 7 * 86400000;
    const weekMinutes = sessions.filter((s) => new Date(s.startedAt).getTime() >= weekAgo).reduce((sum, s) => sum + s.actualMinutes, 0);
    return { totalMinutes, weekMinutes, sessionCount: sessions.length };
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">Your subjects</p>
        <Button size="sm" className="bg-gradient-to-br from-violet-600 to-fuchsia-600" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Add subject
        </Button>
      </div>

      {subjects.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No subjects yet"
          body="Add a subject to organize your focus sessions and see time spent per topic."
          action={
            <Button className="bg-gradient-to-br from-violet-600 to-fuchsia-600" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Add your first subject
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {subjects.map((subject, i) => {
            const colorway = subjectColorway(subject.color);
            const stats = statsFor(subject.id);
            return (
              <FadeIn key={subject.id} index={i}>
              <Card className="overflow-hidden">
                <div className={cn("h-1.5 w-full bg-gradient-to-r", colorway.gradient)} />
                <CardContent className="space-y-2.5 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[20px]">{subject.icon}</span>
                      <p className="text-[14.5px] font-semibold text-foreground">{subject.name}</p>
                    </div>
                    <button
                      onClick={() => confirm(`Remove ${subject.name}?`) && deleteSubject(subject.id)}
                      className="rounded-md p-1 text-muted-foreground hover:bg-danger-soft hover:text-danger"
                      aria-label="Delete subject"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[12.5px] text-muted-foreground">
                    <span>{stats.sessionCount} session{stats.sessionCount === 1 ? "" : "s"}</span>
                    <span>{stats.weekMinutes}m this week</span>
                  </div>
                  <p className="text-[12px] text-muted-foreground">{stats.totalMinutes}m studied total</p>
                </CardContent>
              </Card>
              </FadeIn>
            );
          })}
        </div>
      )}

      <Modal open={open} onOpenChange={setOpen} title="Add a subject" description="Group your focus sessions by subject.">
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-[12.5px] text-muted-foreground">Name</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mathematics"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </label>
          <div>
            <span className="mb-1.5 block text-[12.5px] text-muted-foreground">Icon</span>
            <div className="flex flex-wrap gap-1.5">
              {ICONS.map((i) => (
                <button
                  key={i}
                  onClick={() => setIcon(i)}
                  className={cn("flex h-9 w-9 items-center justify-center rounded-lg border text-[16px]", icon === i ? "border-accent bg-accent-soft" : "border-border hover:bg-muted")}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="mb-1.5 block text-[12.5px] text-muted-foreground">Color</span>
            <div className="flex flex-wrap gap-1.5">
              {SUBJECT_COLORS.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setColor(c.key)}
                  className={cn("h-8 w-8 rounded-full bg-gradient-to-br", c.gradient, color === c.key && "ring-2 ring-offset-2 ring-offset-surface " + c.ring)}
                  aria-label={c.label}
                />
              ))}
            </div>
          </div>
          <Button className="w-full bg-gradient-to-br from-violet-600 to-fuchsia-600" onClick={handleCreate} disabled={!name.trim() || saving}>
            {saving ? "Adding…" : "Add subject"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
