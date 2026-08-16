"use client";

import { useMemo, useState } from "react";
import { Check, Pause, Play, Plus, Search, Sparkles, Target, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { FadeIn } from "@/components/ui/FadeIn";
import { CreateGoalModal } from "@/components/domain/CreateGoalModal";
import { GoalTypeChooser } from "@/components/domain/GoalTypeChooser";
import { BusinessIntakeModal } from "@/components/domain/BusinessIntakeModal";
import { useAlxioum } from "@/lib/store";
import { formatDayLabel, daysBetween, todayISO } from "@/lib/utils";
import { computeGoalStatus, computeProgressPct } from "@/lib/goals/status";
import { GOAL_STATUS_META } from "@/lib/goals/ui";
import { Goal, GoalMilestone, GoalStatus } from "@/lib/types";

const STATUS_FILTERS: { key: GoalStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "on_track", label: "On track" },
  { key: "at_risk", label: "At risk" },
  { key: "behind", label: "Behind" },
  { key: "completed", label: "Completed" },
  { key: "paused", label: "Paused" },
];

const EXAMPLE_PROMPTS = ["Run a 5K by summer", "Save €2000 this year", "Learn Spanish", "Read 12 books this year"];

export default function GoalsPage() {
  const goals = useAlxioum((s) => s.goals);
  const goalMilestones = useAlxioum((s) => s.goalMilestones);
  const goalActions = useAlxioum((s) => s.goalActions);
  const goalActionLogs = useAlxioum((s) => s.goalActionLogs);
  const deleteGoal = useAlxioum((s) => s.deleteGoal);
  const updateGoal = useAlxioum((s) => s.updateGoal);
  const toggleMilestone = useAlxioum((s) => s.toggleMilestone);

  const [createOpen, setCreateOpen] = useState(false);
  const [createPrefill, setCreatePrefill] = useState<string | undefined>(undefined);
  const [typeChooserOpen, setTypeChooserOpen] = useState(false);
  const [businessIntakeOpen, setBusinessIntakeOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<GoalStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string | "all">("all");
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const today = useMemo(() => new Date(), []);

  const enriched = useMemo(
    () =>
      goals.map((goal) => {
        const milestones = goalMilestones.filter((m) => m.goalId === goal.id).sort((a, b) => a.sortOrder - b.sortOrder);
        const actions = goalActions.filter((a) => a.goalId === goal.id);
        const actionLogs = goalActionLogs.filter((l) => actions.some((a) => a.id === l.goalActionId));
        const status = computeGoalStatus(goal, milestones, actions, actionLogs, today);
        const progress = computeProgressPct(goal, milestones);
        const nextMilestone = milestones.find((m) => !m.done);
        return { goal, milestones, status, progress, nextMilestone };
      }),
    [goals, goalMilestones, goalActions, goalActionLogs, today]
  );

  const categories = useMemo(() => Array.from(new Set(goals.map((g) => g.category).filter((c): c is string => !!c))).sort(), [goals]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return enriched.filter(({ goal, status }) => {
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (categoryFilter !== "all" && goal.category !== categoryFilter) return false;
      if (q && !goal.name.toLowerCase().includes(q) && !goal.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [enriched, statusFilter, categoryFilter, query]);

  const counts = useMemo(() => {
    const active = enriched.filter((e) => !e.goal.completed && !e.goal.paused);
    return {
      active: active.length,
      onTrack: active.filter((e) => e.status === "on_track").length,
      atRisk: active.filter((e) => e.status === "at_risk" || e.status === "behind").length,
      completed: enriched.filter((e) => e.goal.completed).length,
    };
  }, [enriched]);

  const focusGoal = useMemo(() => {
    const candidates = enriched.filter((e) => !e.goal.completed && !e.goal.paused);
    if (candidates.length === 0) return null;
    const weight = { high: 2, medium: 1, low: 0 };
    return [...candidates].sort((a, b) => {
      if (weight[b.goal.priority] !== weight[a.goal.priority]) return weight[b.goal.priority] - weight[a.goal.priority];
      if (a.status === "behind" && b.status !== "behind") return -1;
      if (b.status === "behind" && a.status !== "behind") return 1;
      return new Date(a.goal.createdAt).getTime() - new Date(b.goal.createdAt).getTime();
    })[0];
  }, [enriched]);

  function openCreate(prefill?: string) {
    setCreatePrefill(prefill);
    setCreateOpen(true);
  }

  function handleTypeChoice(kind: "personal" | "business") {
    setTypeChooserOpen(false);
    if (kind === "personal") openCreate();
    else setBusinessIntakeOpen(true);
  }

  const visible = filtered.filter((e) => e.goal.id !== focusGoal?.goal.id || statusFilter !== "all" || categoryFilter !== "all" || query.trim());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-[24px] font-medium tracking-tight text-foreground">Goals</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{counts.active ? `${counts.active} in progress` : "Nothing set yet"}</p>
        </div>
        <Button onClick={() => setTypeChooserOpen(true)}>
          <Plus className="h-4 w-4" /> New goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No goals yet"
          body="Describe what you want to achieve and Alxioum will help you turn it into a real plan — milestones, a way to track progress, and honest coaching along the way."
          action={
            <div className="flex flex-wrap justify-center gap-1.5">
              {EXAMPLE_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => openCreate(p)}
                  className="rounded-full border border-border bg-surface px-3 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-muted"
                >
                  {p}
                </button>
              ))}
            </div>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Active", value: counts.active },
              { label: "On track", value: counts.onTrack },
              { label: "Needs attention", value: counts.atRisk },
              { label: "Completed", value: counts.completed },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-4">
                  <p className="text-[20px] font-semibold tabular-nums text-foreground">{stat.value}</p>
                  <p className="mt-0.5 text-[11.5px] text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {focusGoal && statusFilter === "all" && categoryFilter === "all" && !query.trim() && (
            <FocusCard entry={focusGoal} onToggleMilestone={toggleMilestone} />
          )}

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search goals…"
                className="w-full rounded-lg border border-border bg-surface py-1.5 pl-8 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>
            {categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12.5px] text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                  statusFilter === f.key ? "border-accent bg-accent-soft text-accent" : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-muted-foreground">No goals match those filters.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {visible.map((entry, i) => (
                <FadeIn key={entry.goal.id} index={i}>
                  <GoalCard
                    entry={entry}
                    expanded={expandedId === entry.goal.id}
                    onToggleExpand={() => setExpandedId((id) => (id === entry.goal.id ? null : entry.goal.id))}
                    onToggleMilestone={toggleMilestone}
                    onDelete={() => deleteGoal(entry.goal.id)}
                    onTogglePause={() => updateGoal(entry.goal.id, { paused: !entry.goal.paused })}
                  />
                </FadeIn>
              ))}
            </div>
          )}
        </>
      )}

      <CreateGoalModal open={createOpen} onOpenChange={setCreateOpen} initialInput={createPrefill} />
      <GoalTypeChooser open={typeChooserOpen} onOpenChange={setTypeChooserOpen} onChoose={handleTypeChoice} />
      <BusinessIntakeModal open={businessIntakeOpen} onOpenChange={setBusinessIntakeOpen} />
    </div>
  );
}

interface Entry {
  goal: Goal;
  milestones: GoalMilestone[];
  status: GoalStatus;
  progress: number;
  nextMilestone?: GoalMilestone;
}

function StatusBadge({ status }: { status: GoalStatus }) {
  const meta = GOAL_STATUS_META[status];
  const Icon = meta.icon;
  return (
    <Badge tone={meta.tone}>
      <Icon className="h-3 w-3" /> {meta.label}
    </Badge>
  );
}

function FocusCard({ entry, onToggleMilestone }: { entry: Entry; onToggleMilestone: (id: string) => void }) {
  const { goal, milestones, status, progress, nextMilestone } = entry;
  const daysLeft = goal.targetDate ? daysBetween(todayISO(), goal.targetDate) : null;
  return (
    <Card className="border-accent/30 bg-gradient-to-br from-accent-soft/50 to-transparent">
      <CardContent className="p-5">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-accent">
          <Sparkles className="h-3.5 w-3.5" /> Your focus
        </div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="text-2xl leading-none">{goal.icon}</span>
            <div className="min-w-0">
              <h2 className="text-[16px] font-semibold text-foreground">{goal.name}</h2>
              {goal.description && <p className="mt-0.5 line-clamp-1 text-[13px] text-muted-foreground">{goal.description}</p>}
            </div>
          </div>
          <StatusBadge status={status} />
        </div>

        <div className="mt-4 flex items-center gap-2">
          <ProgressBar value={progress} className="flex-1" tone={status === "behind" ? "warning" : "accent"} />
          <span className="shrink-0 text-[12px] font-medium tabular-nums text-muted-foreground">{progress}%</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
          {daysLeft !== null && <span>{daysLeft >= 0 ? `${daysLeft} days left` : "Target date passed"}</span>}
          {nextMilestone && (
            <button onClick={() => onToggleMilestone(nextMilestone.id)} className="flex items-center gap-1 font-medium text-accent hover:opacity-80">
              <Check className="h-3 w-3" /> Next: {nextMilestone.title}
            </button>
          )}
          {!nextMilestone && milestones.length === 0 && goal.measurementType !== "checklist" && (
            <span>
              {goal.measurementCurrent} / {goal.measurementTarget ?? "?"} {goal.measurementUnit}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function GoalCard({
  entry,
  expanded,
  onToggleExpand,
  onToggleMilestone,
  onDelete,
  onTogglePause,
}: {
  entry: Entry;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleMilestone: (id: string) => void;
  onDelete: () => void;
  onTogglePause: () => void;
}) {
  const { goal, milestones, status, progress } = entry;
  const doneCount = milestones.filter((m) => m.done).length;

  return (
    <Card className={goal.paused ? "opacity-70" : undefined}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2">
            <span className="text-xl leading-none">{goal.icon}</span>
            <div className="min-w-0">
              <h2 className="truncate text-[14.5px] font-semibold text-foreground">{goal.name}</h2>
              {goal.category && <p className="text-[11px] text-muted-foreground">{goal.category}</p>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <button onClick={onTogglePause} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted" aria-label={goal.paused ? "Resume goal" : "Pause goal"}>
              {goal.paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            </button>
            <button onClick={onDelete} className="rounded-md p-1.5 text-muted-foreground hover:bg-danger-soft hover:text-danger" aria-label="Delete goal">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-2.5 flex items-center gap-2">
          <ProgressBar value={progress} className="flex-1" tone={status === "behind" ? "warning" : "accent"} />
          <span className="shrink-0 text-[11.5px] font-medium tabular-nums text-muted-foreground">{progress}%</span>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
          <StatusBadge status={status} />
          {goal.targetDate && <span className="text-[11px] text-muted-foreground">Target {formatDayLabel(goal.targetDate)}</span>}
        </div>

        {milestones.length > 0 && (
          <button onClick={onToggleExpand} className="mt-2.5 text-[12px] font-medium text-accent hover:opacity-80">
            {doneCount} / {milestones.length} milestones {expanded ? "▴" : "▾"}
          </button>
        )}
        {expanded && milestones.length > 0 && (
          <div className="mt-2 space-y-1">
            {milestones.map((m) => (
              <button key={m.id} onClick={() => onToggleMilestone(m.id)} className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left hover:bg-muted/60">
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${m.done ? "border-accent bg-accent text-accent-foreground" : "border-border"}`}>
                  {m.done && <Check className="h-3 w-3" />}
                </span>
                <span className={`text-[12.5px] ${m.done ? "text-muted-foreground line-through" : "text-foreground"}`}>{m.title}</span>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
