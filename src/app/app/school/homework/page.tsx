"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardCheck, Plus, Trash2, Pencil, Sparkles, CheckCircle2, Circle, TriangleAlert } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useHomework } from "@/lib/hooks/domain";
import { supabase } from "@/lib/supabase/client";
import { awardXP } from "@/lib/actions/xp";
import { formatCountdown, todayISO, cn } from "@/lib/utils";
import type { Homework } from "@/lib/types";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PriorityBadge } from "@/components/ui/PriorityBadge";

const HOMEWORK_XP: Record<Homework["priority"], number> = { high: 15, medium: 10, low: 8 };

export default function HomeworkPage() {
  const { user, profile, refreshProfile } = useAuth();
  const { data: homework, error, refetch } = useHomework(user?.id);

  const [newSubject, setNewSubject] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [editDateValue, setEditDateValue] = useState("");
  const [savingDate, setSavingDate] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const sortedHomework = useMemo(
    () =>
      [...homework].sort((a, b) => {
        if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
        return a.due_date.localeCompare(b.due_date);
      }),
    [homework]
  );

  async function addHomework(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !user || !newSubject.trim() || !newTitle.trim() || !newDueDate || adding) return;
    setAdding(true);
    try {
      await supabase.from("homework").insert({
        user_id: user.id,
        subject: newSubject.trim(),
        title: newTitle.trim(),
        due_date: newDueDate,
        priority: "medium",
        status: "pending",
      });
      setNewSubject("");
      setNewTitle("");
      setNewDueDate("");
      await refetch();
    } finally {
      setAdding(false);
    }
  }

  async function deleteHomework(hwId: string) {
    // Matches the confirm-then-delete pattern already used for exams (see
    // exams/page.tsx's deleteExam) — a browser confirm is the right amount
    // of friction, not a full modal.
    if (!supabase || deletingId) return;
    if (!confirm("Delete this homework item? This can't be undone.")) return;
    setDeletingId(hwId);
    try {
      await supabase.from("homework").delete().eq("id", hwId);
      await refetch();
    } finally {
      setDeletingId(null);
    }
  }

  function startEditDate(hwId: string, currentDate: string) {
    setEditingDateId(hwId);
    setEditDateValue(currentDate);
  }

  async function saveDueDate(hwId: string) {
    if (!supabase || !editDateValue || savingDate) return;
    setSavingDate(true);
    try {
      await supabase.from("homework").update({ due_date: editDateValue }).eq("id", hwId);
      setEditingDateId(null);
      await refetch();
    } finally {
      setSavingDate(false);
    }
  }

  async function toggleHomework(hw: Homework) {
    // One-way completion (not a toggle back to pending), matching the exact
    // behavior this had on the School Home screen before this page existed.
    if (!user || !profile || !supabase || hw.status === "completed" || busyId) return;
    setBusyId(hw.id);
    try {
      await supabase.from("homework").update({ status: "completed" }).eq("id", hw.id);
      await awardXP(supabase, user.id, profile, { xp_school: HOMEWORK_XP[hw.priority] });
      await Promise.all([refreshProfile(), refetch()]);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={addHomework} className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            placeholder="Subject…"
            className="h-11 w-28 shrink-0 rounded-full border border-border bg-surface px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-accent/60 sm:w-32"
          />
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add homework…"
            className="h-11 min-w-0 flex-1 rounded-full border border-border bg-surface px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-accent/60"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
            aria-label="Due date"
            required
            min={todayISO()}
            className="h-11 min-w-0 flex-1 rounded-full border border-border bg-surface px-4 text-sm text-foreground outline-none focus:border-accent/60"
          />
          <button
            type="submit"
            disabled={adding || !newSubject.trim() || !newTitle.trim() || !newDueDate}
            aria-label="Add homework"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-white shadow-raised transition-opacity disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </form>

      {error && (
        <Card className="border border-danger/40">
          <CardContent className="flex items-start gap-2.5 p-4 text-sm text-danger">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Couldn&rsquo;t load your homework. {error}</span>
          </CardContent>
        </Card>
      )}

      {sortedHomework.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="Nothing set right now" subtitle="Add homework above to start tracking it." />
      ) : (
        sortedHomework.map((hw) => {
          const isCompleted = hw.status === "completed";
          return (
            <Card key={hw.id}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    aria-label="Mark as complete"
                    onClick={() => toggleHomework(hw)}
                    disabled={isCompleted || busyId === hw.id}
                    className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-success disabled:cursor-default disabled:opacity-40"
                  >
                    {isCompleted ? <CheckCircle2 className="h-6 w-6 text-success" /> : <Circle className="h-6 w-6" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm font-semibold text-foreground", isCompleted && "text-muted-foreground line-through")}>
                      {hw.subject}: {hw.title}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs text-muted-foreground">{isCompleted ? "Completed" : formatCountdown(hw.due_date)}</p>
                        {!isCompleted && <PriorityBadge priority={hw.priority} />}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {!isCompleted && (
                          <>
                            <Link
                              href={`/app/school/homework/${hw.id}/help`}
                              aria-label="Get AI help with this homework"
                              title="Get AI help"
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-accent transition-colors hover:bg-border-strong/40"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                            </Link>
                            <button
                              type="button"
                              aria-label="Edit due date"
                              onClick={() => startEditDate(hw.id, hw.due_date)}
                              className="rounded-full p-1.5 text-muted-foreground transition-colors hover:text-accent"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          aria-label="Delete homework"
                          onClick={() => deleteHomework(hw.id)}
                          disabled={deletingId === hw.id}
                          className="rounded-full p-1.5 text-muted-foreground transition-colors hover:text-danger disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {editingDateId === hw.id && (
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="date"
                      value={editDateValue}
                      onChange={(e) => setEditDateValue(e.target.value)}
                      aria-label="New due date"
                      className="h-9 flex-1 rounded-full border border-border bg-surface px-3 text-xs text-foreground outline-none focus:border-accent/60"
                    />
                    <Button size="sm" onClick={() => saveDueDate(hw.id)} disabled={!editDateValue || savingDate}>
                      Save
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditingDateId(null)}>
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
