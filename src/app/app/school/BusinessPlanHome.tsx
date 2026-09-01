"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Sparkles, Target, Plus, CalendarClock, TriangleAlert } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useBusinessProfile, useBusinessMilestones } from "@/lib/hooks/domain";
import { supabase } from "@/lib/supabase/client";
import { awardXP } from "@/lib/actions/xp";
import { cn, formatCountdown } from "@/lib/utils";
import { bucketForDate, badgeToneForBucket } from "@/lib/deadlines";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const STAGE_LABEL: Record<string, string> = {
  idea: "Idea",
  validating: "Validating",
  building: "Building",
  launched: "Launched",
};

export default function BusinessPlanHome() {
  const { user, profile, refreshProfile } = useAuth();
  const { data: businessProfile } = useBusinessProfile(user?.id);
  const { data: milestones, error: milestonesError, refetch: refetchMilestones } = useBusinessMilestones(user?.id);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [adding, setAdding] = useState(false);

  const doneCount = milestones.filter((m) => m.status === "done").length;

  async function toggleMilestone(id: string, currentStatus: string) {
    // One-way completion, same guard pattern as StudentSchoolHome's
    // completeStudySession/toggleHomework — once done, this is a no-op.
    // Prevents XP-farming by repeatedly toggling the same milestone.
    if (!supabase || !user || !profile || currentStatus === "done" || busyId) return;
    setBusyId(id);
    try {
      await supabase.from("business_milestones").update({ status: "done" }).eq("id", id);
      await awardXP(supabase, user.id, profile, { xp_career: 15 });
      await refreshProfile();
      await refetchMilestones();
    } finally {
      setBusyId(null);
    }
  }

  async function addMilestone(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !user || !newTitle.trim() || adding) return;
    setAdding(true);
    try {
      await supabase.from("business_milestones").insert({
        user_id: user.id,
        title: newTitle.trim(),
        status: "todo",
        order_index: milestones.length,
        due_date: newDueDate || null,
      });
      setNewTitle("");
      setNewDueDate("");
      await refetchMilestones();
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-7">
      {milestonesError && (
        <Card className="border border-danger/40">
          <CardContent className="flex items-start gap-2.5 p-4 text-sm text-danger">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Couldn&rsquo;t load your milestones. {milestonesError}</span>
          </CardContent>
        </Card>
      )}

      <Card className="border-accent/30">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Your Business</p>
            {businessProfile && <Badge tone="accent">{STAGE_LABEL[businessProfile.stage] ?? businessProfile.stage}</Badge>}
          </div>
          <p className="mt-2 text-sm font-semibold text-foreground">{businessProfile?.business_idea || "No idea saved yet"}</p>
          {businessProfile?.ai_snapshot && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-accent-soft/40 p-3">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
              <p className="text-xs leading-relaxed text-foreground">{businessProfile.ai_snapshot}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Milestones</h2>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            {doneCount}/{milestones.length}
          </span>
        </div>

        {milestones.length === 0 ? (
          <EmptyState icon={Target} title="No milestones yet" subtitle="Add your first milestone below to start your plan." />
        ) : (
          <div className="space-y-2">
            {milestones.map((m) => {
              const isDone = m.status === "done";
              return (
                <Card key={m.id}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <button
                      type="button"
                      aria-label="Mark as done"
                      onClick={() => toggleMilestone(m.id, m.status)}
                      disabled={isDone || busyId === m.id}
                      className="shrink-0 text-muted-foreground transition-colors hover:text-success disabled:cursor-default disabled:opacity-40"
                    >
                      {isDone ? <CheckCircle2 className="h-6 w-6 text-success" /> : <Circle className="h-6 w-6" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate text-sm font-semibold text-foreground", isDone && "text-muted-foreground line-through")}>
                        {m.title}
                      </p>
                      {m.description && <p className="mt-0.5 truncate text-xs text-muted-foreground">{m.description}</p>}
                      {m.due_date && !isDone && (
                        <Badge tone={badgeToneForBucket(bucketForDate(m.due_date))} className="mt-1.5">
                          {formatCountdown(m.due_date)}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <form onSubmit={addMilestone} className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Add a milestone…"
              className="h-11 flex-1 rounded-full border border-border bg-surface px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-accent/60"
            />
            <button
              type="submit"
              disabled={adding || !newTitle.trim()}
              aria-label="Add milestone"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-white shadow-glow-accent transition-opacity disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 pl-1">
            <CalendarClock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <label htmlFor="milestone-due-date" className="text-xs text-muted-foreground">
              Due date <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <input
              id="milestone-due-date"
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="h-8 rounded-full border border-border bg-surface px-3 text-xs text-foreground outline-none focus:border-accent/60"
            />
          </div>
        </form>
      </section>

      <Link href="/app/coach">
        <Button variant="secondary" size="lg" className="w-full">
          <Sparkles className="h-4 w-4" />
          Ask AI Coach for guidance
        </Button>
      </Link>
    </div>
  );
}
