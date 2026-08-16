"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAlxioum } from "@/lib/store";
import { IdeaCandidate, IdeaFinderAnswers } from "@/lib/business/ideas";
import { IdeaComparisonView } from "./IdeaComparisonView";
import { cn } from "@/lib/utils";

const inputBase =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40";
const inputClass = cn(inputBase, "w-full");

const EXAMPLE_PROMPTS = ["I want to start an online business.", "I want to make €1,000/month.", "I want to build an AI SaaS.", "I want to turn my idea into a real company."];

const DISCOVER_QUESTIONS: { key: keyof IdeaFinderAnswers; label: string; placeholder: string }[] = [
  { key: "goodAt", label: "What are you good at?", placeholder: "e.g. writing, design, spreadsheets, teaching…" },
  { key: "enjoy", label: "What do you enjoy?", placeholder: "e.g. cooking, fitness, helping people, building things…" },
  { key: "timeAvailable", label: "How much time can you spend per week?", placeholder: "e.g. 5 hours, evenings only, full-time…" },
  { key: "budget", label: "What's your budget to start?", placeholder: "e.g. €0, under €500, a few thousand…" },
  { key: "format", label: "Online, physical, or either?", placeholder: "e.g. online only" },
  { key: "customerType", label: "What type of customer interests you?", placeholder: "e.g. small businesses, students, other creators…" },
];

type Step = "start" | "discover" | "compare" | "review";

interface ReviewState {
  name: string;
  ideaSummary: string;
  problem: string;
  solution: string;
  targetCustomer: string;
  valueProposition: string;
  measurementTarget: string;
  targetDate: string;
}

function emptyReview(): ReviewState {
  return { name: "", ideaSummary: "", problem: "", solution: "", targetCustomer: "", valueProposition: "", measurementTarget: "1000", targetDate: "" };
}

function reviewFromIdea(idea: IdeaCandidate): ReviewState {
  return {
    name: idea.name,
    ideaSummary: idea.solution,
    problem: idea.problem,
    solution: idea.solution,
    targetCustomer: idea.customer,
    valueProposition: idea.solution,
    measurementTarget: "1000",
    targetDate: "",
  };
}

export function BusinessIntakeModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createBusinessGoal = useAlxioum((s) => s.createBusinessGoal);
  const getAccessToken = useAlxioum((s) => s.getAccessToken);
  const router = useRouter();

  const [step, setStep] = useState<Step>("start");
  const [input, setInput] = useState("");
  const [answers, setAnswers] = useState<IdeaFinderAnswers>({});
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<IdeaCandidate[]>([]);
  const [recommendedIndex, setRecommendedIndex] = useState<number | null>(null);
  const [recommendationNote, setRecommendationNote] = useState<string | undefined>();
  const [review, setReview] = useState<ReviewState>(emptyReview());

  useEffect(() => {
    if (open) {
      setStep("start");
      setInput("");
      setAnswers({});
      setError(null);
      setIdeas([]);
      setReview(emptyReview());
    }
  }, [open]);

  async function findIdeas(payload: { freeText?: string; answers?: IdeaFinderAnswers }) {
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Your session expired. Please sign in again.");
      const res = await fetch("/api/business/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't come up with ideas for that. Try describing it differently.");
      setIdeas(json.ideas ?? []);
      setRecommendedIndex(typeof json.recommendedIndex === "number" ? json.recommendedIndex : null);
      setRecommendationNote(json.recommendationNote ?? undefined);
      setStep("compare");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't come up with ideas for that.");
    } finally {
      setLoading(false);
    }
  }

  function chooseIdea(idea: IdeaCandidate) {
    setReview(reviewFromIdea(idea));
    setError(null);
    setStep("review");
  }

  function skipToReview() {
    setReview((r) => ({ ...r, name: input.trim(), ideaSummary: input.trim() }));
    setError(null);
    setStep("review");
  }

  async function createBusiness() {
    if (!review.name.trim() || creating) return;
    setCreating(true);
    setError(null);
    try {
      const created = await createBusinessGoal({
        name: review.name.trim(),
        ideaSummary: review.ideaSummary.trim() || undefined,
        problem: review.problem.trim() || undefined,
        solution: review.solution.trim() || undefined,
        targetCustomer: review.targetCustomer.trim() || undefined,
        valueProposition: review.valueProposition.trim() || undefined,
        measurementTarget: review.measurementTarget ? Number(review.measurementTarget) : undefined,
        targetDate: review.targetDate || undefined,
      });
      if (!created) throw new Error("Couldn't start that business. Try again.");
      onOpenChange(false);
      router.push(`/app/goals/business/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start that business. Try again.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={step === "start" ? "Tell Alxioum what you're trying to build." : step === "discover" ? "A few quick questions" : step === "compare" ? "Here's what I found" : "Review before you start"}
      description={
        step === "start"
          ? "Describe your idea, or tell me you don't have one yet and I'll help you find one."
          : step === "discover"
            ? "Answer what you can — skip the rest."
            : step === "compare"
              ? "AI-generated ideas based on what you told me. Pick one to build, or go back and describe your own."
              : "Nothing is saved until you start building — edit anything below first."
      }
      className="max-w-xl"
    >
      {step === "start" && (
        <div className="space-y-4">
          <textarea
            className={cn(inputClass, "min-h-[76px] resize-none")}
            placeholder="e.g. I want to build an AI SaaS, or I don't know what business to start…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLE_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => setInput(p)}
                className="rounded-full border border-border/70 px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground"
              >
                {p}
              </button>
            ))}
          </div>
          {error && <p className="text-[12.5px] text-danger">{error}</p>}
          <Button onClick={() => findIdeas({ freeText: input.trim() })} disabled={!input.trim() || loading} className="w-full justify-center">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Thinking…" : "Find ideas"}
          </Button>
          <button onClick={() => setStep("discover")} className="w-full text-center text-[12.5px] font-medium text-accent hover:opacity-80">
            I don&apos;t know what business to start
          </button>
        </div>
      )}

      {step === "discover" && (
        <div className="space-y-3">
          {DISCOVER_QUESTIONS.map((q) => (
            <div key={q.key}>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{q.label}</label>
              <input
                className={inputClass}
                placeholder={q.placeholder}
                value={answers[q.key] ?? ""}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.key]: e.target.value }))}
              />
            </div>
          ))}
          {error && <p className="text-[12.5px] text-danger">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={() => setStep("start")} className="flex-1 justify-center">
              Back
            </Button>
            <Button onClick={() => findIdeas({ answers })} disabled={loading} className="flex-1 justify-center">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? "Thinking…" : "Find ideas"}
            </Button>
          </div>
        </div>
      )}

      {step === "compare" && (
        <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
          {ideas.length === 0 ? (
            <p className="text-[12.5px] text-muted-foreground">No ideas came back — try describing it differently.</p>
          ) : (
            <IdeaComparisonView ideas={ideas} recommendedIndex={recommendedIndex} recommendationNote={recommendationNote} onChoose={chooseIdea} />
          )}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={() => setStep("start")} className="flex-1 justify-center">
              Back
            </Button>
            <Button variant="outline" onClick={skipToReview} className="flex-1 justify-center">
              Use my own idea instead
            </Button>
          </div>
        </div>
      )}

      {step === "review" && (
        <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Business name</label>
            <input className={inputClass} value={review.name} onChange={(e) => setReview((r) => ({ ...r, name: e.target.value }))} placeholder="Name your business" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">The idea</label>
            <textarea
              className={cn(inputClass, "min-h-[60px] resize-none")}
              value={review.ideaSummary}
              onChange={(e) => setReview((r) => ({ ...r, ideaSummary: e.target.value }))}
              placeholder="What are you building?"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Revenue goal (per month)</label>
              <input
                type="number"
                min={0}
                className={inputClass}
                value={review.measurementTarget}
                onChange={(e) => setReview((r) => ({ ...r, measurementTarget: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Target date (optional)</label>
              <input type="date" className={inputClass} value={review.targetDate} onChange={(e) => setReview((r) => ({ ...r, targetDate: e.target.value }))} />
            </div>
          </div>
          {error && <p className="text-[12.5px] text-danger">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={() => setStep(ideas.length ? "compare" : "start")} className="flex-1 justify-center">
              Back
            </Button>
            <Button onClick={createBusiness} disabled={!review.name.trim() || creating} className="flex-1 justify-center">
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              {creating ? "Starting…" : "Start Building"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
