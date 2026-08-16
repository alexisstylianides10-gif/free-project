"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Sparkles, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAlxioum } from "@/lib/store";
import { GoalDifficulty, GoalMeasurementType, GoalPriority } from "@/lib/types";
import { GOAL_CATEGORY_SUGGESTIONS, GOAL_TEMPLATES, GoalTemplate } from "@/lib/goals/ui";
import { cn } from "@/lib/utils";

// No width utility baked in here on purpose — callers that sit alone in a
// row add w-full, callers sharing a flex row with another field add flex-1
// or a fixed width instead, so two siblings never both claim 100%.
const inputBase =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40";
const inputClass = cn(inputBase, "w-full");

interface ReviewMilestone {
  title: string;
  description: string;
}

interface ReviewState {
  name: string;
  description: string;
  icon: string;
  category: string;
  priority: GoalPriority;
  difficulty: GoalDifficulty;
  measurementType: GoalMeasurementType;
  measurementUnit: string;
  measurementTarget: string;
  targetDate: string;
  milestones: ReviewMilestone[];
}

const MEASUREMENT_LABELS: Record<GoalMeasurementType, string> = {
  checklist: "Milestones only",
  numeric: "A number (e.g. money saved)",
  distance: "A distance",
  count: "A count (e.g. books read)",
  streak: "A streak (consecutive days)",
  time: "Time spent",
};

function emptyReview(): ReviewState {
  return {
    name: "",
    description: "",
    icon: "🎯",
    category: "",
    priority: "medium",
    difficulty: "moderate",
    measurementType: "checklist",
    measurementUnit: "",
    measurementTarget: "",
    targetDate: "",
    milestones: [],
  };
}

function fromTemplate(t: GoalTemplate): ReviewState {
  return {
    name: t.name,
    description: t.description,
    icon: t.icon,
    category: t.category,
    priority: t.priority,
    difficulty: t.difficulty,
    measurementType: t.measurementType,
    measurementUnit: t.measurementUnit,
    measurementTarget: t.measurementTarget !== undefined ? String(t.measurementTarget) : "",
    targetDate: "",
    milestones: t.milestones.map((m) => ({ title: m.title, description: m.description ?? "" })),
  };
}

export function CreateGoalModal({ open, onOpenChange, initialInput }: { open: boolean; onOpenChange: (open: boolean) => void; initialInput?: string }) {
  const addGoal = useAlxioum((s) => s.addGoal);
  const addMilestone = useAlxioum((s) => s.addMilestone);
  const getAccessToken = useAlxioum((s) => s.getAccessToken);

  const [step, setStep] = useState<"start" | "review">("start");
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<ReviewState>(emptyReview());

  useEffect(() => {
    if (open) {
      setStep("start");
      setInput(initialInput ?? "");
      setError(null);
      setReview(emptyReview());
    }
  }, [open, initialInput]);

  async function decompose() {
    const trimmed = input.trim();
    if (!trimmed || thinking) return;
    setThinking(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Your session expired. Please sign in again.");
      const res = await fetch("/api/goals/decompose", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ input: trimmed }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't build a plan for that.");
      setReview({
        name: json.name,
        description: json.description ?? "",
        icon: json.icon || "🎯",
        category: json.category ?? "",
        priority: json.priority ?? "medium",
        difficulty: json.difficulty ?? "moderate",
        measurementType: json.measurementType ?? "checklist",
        measurementUnit: json.measurementUnit ?? "",
        measurementTarget: json.measurementTarget !== undefined && json.measurementTarget !== null ? String(json.measurementTarget) : "",
        targetDate: json.targetDate ?? "",
        milestones: (json.milestones ?? []).map((m: { title: string; description?: string }) => ({ title: m.title, description: m.description ?? "" })),
      });
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't build a plan for that.");
    } finally {
      setThinking(false);
    }
  }

  function applyTemplate(t: GoalTemplate) {
    setReview(fromTemplate(t));
    setError(null);
    setStep("review");
  }

  function updateMilestone(i: number, title: string) {
    setReview((r) => ({ ...r, milestones: r.milestones.map((m, idx) => (idx === i ? { ...m, title } : m)) }));
  }
  function removeMilestone(i: number) {
    setReview((r) => ({ ...r, milestones: r.milestones.filter((_, idx) => idx !== i) }));
  }
  function addBlankMilestone() {
    setReview((r) => ({ ...r, milestones: [...r.milestones, { title: "", description: "" }] }));
  }

  async function createGoal() {
    if (!review.name.trim() || creating) return;
    setCreating(true);
    setError(null);
    try {
      const created = await addGoal({
        name: review.name.trim(),
        description: review.description.trim() || undefined,
        targetDate: review.targetDate || undefined,
        icon: review.icon || undefined,
        category: review.category.trim() || undefined,
        priority: review.priority,
        difficulty: review.difficulty,
        measurementType: review.measurementType,
        measurementUnit: review.measurementType === "checklist" ? undefined : review.measurementUnit.trim() || undefined,
        measurementTarget: review.measurementType === "checklist" ? undefined : review.measurementTarget ? Number(review.measurementTarget) : undefined,
      });
      if (!created) throw new Error("Couldn't create that goal. Try again.");
      const titledMilestones = review.milestones.filter((m) => m.title.trim());
      for (let i = 0; i < titledMilestones.length; i++) {
        const m = titledMilestones[i];
        await addMilestone({ goalId: created.id, title: m.title.trim(), sortOrder: i, description: m.description.trim() || undefined });
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create that goal. Try again.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={step === "start" ? "What do you want to achieve?" : "Review your goal"}
      description={step === "start" ? "Describe it in your own words, or start from a template." : "Nothing is saved until you create it — edit anything below first."}
      className="max-w-xl"
    >
      {step === "start" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <textarea
              className={cn(inputClass, "min-h-[76px] resize-none")}
              placeholder="e.g. Run a 5K by summer, save €2000, learn Spanish…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>
          {error && <p className="text-[12.5px] text-danger">{error}</p>}
          <Button onClick={decompose} disabled={!input.trim() || thinking} className="w-full justify-center">
            {thinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {thinking ? "Thinking…" : "Build a plan"}
          </Button>

          <div className="pt-2">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Or start from a template</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {GOAL_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => applyTemplate(t)}
                  className="flex flex-col items-start gap-1 rounded-lg border border-border bg-background p-2.5 text-left transition-colors hover:bg-muted/60"
                >
                  <span className="text-lg leading-none">{t.icon}</span>
                  <span className="text-[12.5px] font-medium text-foreground">{t.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === "review" && (
        <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
          <div className="flex gap-2">
            <input
              className={cn(inputBase, "w-16 shrink-0 text-center text-lg")}
              value={review.icon}
              onChange={(e) => setReview((r) => ({ ...r, icon: e.target.value.slice(0, 4) }))}
              aria-label="Goal icon"
            />
            <input
              className={cn(inputBase, "min-w-0 flex-1")}
              placeholder="Goal name"
              value={review.name}
              onChange={(e) => setReview((r) => ({ ...r, name: e.target.value }))}
            />
          </div>

          <textarea
            className={cn(inputClass, "min-h-[60px] resize-none")}
            placeholder="Short description"
            value={review.description}
            onChange={(e) => setReview((r) => ({ ...r, description: e.target.value }))}
          />

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Category (optional)</label>
            <input
              className={inputClass}
              placeholder="e.g. Health, Career, Learning…"
              value={review.category}
              onChange={(e) => setReview((r) => ({ ...r, category: e.target.value }))}
              list="goal-category-suggestions"
            />
            <datalist id="goal-category-suggestions">
              {GOAL_CATEGORY_SUGGESTIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Priority</label>
              <div className="flex gap-1">
                {(["low", "medium", "high"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setReview((r) => ({ ...r, priority: p }))}
                    className={`flex-1 rounded-md border px-2 py-1.5 text-[12px] font-medium capitalize transition-colors ${
                      review.priority === p ? "border-accent bg-accent-soft text-accent" : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Target date (optional)</label>
              <input type="date" className={inputClass} value={review.targetDate} onChange={(e) => setReview((r) => ({ ...r, targetDate: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Difficulty</label>
            <div className="flex gap-1">
              {(["easy", "moderate", "challenging", "ambitious"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setReview((r) => ({ ...r, difficulty: d }))}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-[11.5px] font-medium capitalize transition-colors ${
                    review.difficulty === d ? "border-accent bg-accent-soft text-accent" : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">How should progress be tracked?</label>
            <select
              className={inputClass}
              value={review.measurementType}
              onChange={(e) => setReview((r) => ({ ...r, measurementType: e.target.value as GoalMeasurementType }))}
            >
              {(Object.keys(MEASUREMENT_LABELS) as GoalMeasurementType[]).map((k) => (
                <option key={k} value={k}>
                  {MEASUREMENT_LABELS[k]}
                </option>
              ))}
            </select>
            {review.measurementType !== "checklist" && (
              <div className="mt-2 flex gap-2">
                <input
                  className={cn(inputBase, "min-w-0 flex-1")}
                  type="number"
                  min={0}
                  placeholder="Target number"
                  value={review.measurementTarget}
                  onChange={(e) => setReview((r) => ({ ...r, measurementTarget: e.target.value }))}
                />
                <input
                  className={cn(inputBase, "w-28 shrink-0")}
                  placeholder="Unit (km, €…)"
                  value={review.measurementUnit}
                  onChange={(e) => setReview((r) => ({ ...r, measurementUnit: e.target.value }))}
                />
              </div>
            )}
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Milestones</label>
              <button onClick={addBlankMilestone} className="flex items-center gap-1 text-[12px] font-medium text-accent hover:opacity-80">
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
            <div className="space-y-1.5">
              {review.milestones.map((m, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input className={cn(inputBase, "min-w-0 flex-1")} value={m.title} onChange={(e) => updateMilestone(i, e.target.value)} placeholder={`Milestone ${i + 1}`} />
                  <button onClick={() => removeMilestone(i)} className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-danger-soft hover:text-danger" aria-label="Remove milestone">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {review.milestones.length === 0 && <p className="text-[12px] text-muted-foreground">No milestones yet — add one, or leave this goal to track by number only.</p>}
            </div>
          </div>

          {error && <p className="text-[12.5px] text-danger">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={() => setStep("start")} className="flex-1 justify-center">
              Back
            </Button>
            <Button onClick={createGoal} disabled={!review.name.trim() || creating} className="flex-1 justify-center">
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              {creating ? "Creating…" : "Create Goal"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
