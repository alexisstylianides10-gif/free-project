"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Sparkles, Target, Plus } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useBusinessProfile, useBusinessMilestones } from "@/lib/hooks/domain";
import { supabase } from "@/lib/supabase/client";
import { awardXP } from "@/lib/actions/xp";
import { cn } from "@/lib/utils";
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
  const { data: milestones, refetch: refetchMilestones } = useBusinessMilestones(user?.id);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const doneCount = milestones.filter((m) => m.status === "done").length;

  async function toggleMilestone(id: string, currentStatus: string) {
    if (!supabase || !user || !profile || busyId) return;
    setBusyId(id);
    try {
      const nextStatus = currentStatus === "done" ? "todo" : "done";
      await supabase.from("business_milestones").update({ status: nextStatus }).eq("id", id);
      if (nextStatus === "done") {
        await awardXP(supabase, user.id, profile, { xp_career: 15 });
        await refreshProfile();
      }
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
      });
      setNewTitle("");
      await refetchMilestones();
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-7">
      <Card>
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
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">No milestones yet — add your first below.</CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {milestones.map((m) => {
              const isDone = m.status === "done";
              return (
                <Card key={m.id}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <button
                      type="button"
                      aria-label={isDone ? "Mark as not done" : "Mark as done"}
                      onClick={() => toggleMilestone(m.id, m.status)}
                      disabled={busyId === m.id}
                      className="shrink-0 text-muted-foreground transition-colors hover:text-success disabled:opacity-40"
                    >
                      {isDone ? <CheckCircle2 className="h-6 w-6 text-success" /> : <Circle className="h-6 w-6" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate text-sm font-semibold text-foreground", isDone && "text-muted-foreground line-through")}>
                        {m.title}
                      </p>
                      {m.description && <p className="mt-0.5 truncate text-xs text-muted-foreground">{m.description}</p>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <form onSubmit={addMilestone} className="mt-3 flex items-center gap-2">
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
