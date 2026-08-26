"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { SelectableCard } from "@/components/shared/SelectableCard";
import { OnboardingShell } from "./OnboardingShell";
import {
  BUSINESS_STAGE_OPTIONS,
  BUSINESS_FOCUS_OPTIONS,
  BUSINESS_STRENGTH_OPTIONS,
  FREE_TIME_OPTIONS,
  BUSINESS_GOAL_OPTIONS,
  BUSINESS_PROBLEM_OPTIONS,
} from "@/lib/catalog/onboarding-options";
import { completeBusinessOnboarding, type FullBusinessOnboardingAnswers } from "@/lib/onboarding/completeBusinessOnboarding";
import { useAuth } from "@/components/providers/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { branding } from "@/lib/branding";

type Answers = FullBusinessOnboardingAnswers;

const EMPTY_ANSWERS: Answers = {
  businessIdea: "",
  stage: "idea",
  targetCustomer: "",
  focusAreas: [],
  strengths: [],
  freeTime: "",
  biggestGoal: "",
  biggestProblem: "",
};

function toggle(list: string[], key: string): string[] {
  return list.includes(key) ? list.filter((k) => k !== key) : [...list, key];
}

const QUESTION_COUNT = 8;

export default function BusinessOnboarding() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(0); // 0..7 = questions, 8 = results
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [submitting, setSubmitting] = useState(false);

  const isValid = (() => {
    switch (step) {
      case 0:
        return answers.businessIdea.trim() !== "";
      case 1:
        return Boolean(answers.stage);
      case 2:
        return answers.targetCustomer.trim() !== "";
      case 3:
        return answers.focusAreas.length > 0;
      case 4:
        return answers.strengths.length > 0;
      case 5:
        return answers.freeTime !== "";
      case 6:
        return answers.biggestGoal !== "";
      case 7:
        return answers.biggestProblem !== "";
      default:
        return true;
    }
  })();

  function next() {
    if (step < QUESTION_COUNT) setStep(step + 1);
  }
  function back() {
    if (step === 0) {
      router.push("/");
      return;
    }
    setStep(step - 1);
  }

  async function buildMyPlan() {
    if (!supabase || !user || submitting) return;
    setSubmitting(true);
    try {
      await completeBusinessOnboarding(supabase, user.id, answers);
      await refreshProfile();
      router.push("/app");
    } catch {
      setSubmitting(false);
    }
  }

  if (submitting) {
    return <LoadingScreen message="Researching your idea and building your plan — this can take up to a minute…" />;
  }

  if (step === QUESTION_COUNT) {
    return <ResultsScreen answers={answers} onContinue={buildMyPlan} />;
  }

  return (
    <OnboardingShell
      step={step}
      totalSteps={QUESTION_COUNT}
      onBack={back}
      footer={
        <Button size="lg" className="w-full" disabled={!isValid} onClick={next}>
          Continue
        </Button>
      }
    >
      {step === 0 && (
        <Question title="What's your business idea?" subtitle="A sentence or two is plenty">
          <textarea
            autoFocus
            value={answers.businessIdea}
            onChange={(e) => setAnswers({ ...answers, businessIdea: e.target.value })}
            placeholder="e.g. A subscription box for..."
            rows={5}
            className="w-full resize-none rounded-2xl border border-border bg-surface p-4 text-[15px] text-foreground outline-none placeholder:text-muted-foreground focus:border-accent/60"
          />
        </Question>
      )}

      {step === 1 && (
        <Question title="What stage are you at?">
          <div className="space-y-2.5">
            {BUSINESS_STAGE_OPTIONS.map((o) => (
              <SelectableCard
                key={o.key}
                label={o.label}
                selected={answers.stage === o.key}
                onClick={() => setAnswers({ ...answers, stage: o.key as Answers["stage"] })}
              />
            ))}
          </div>
        </Question>
      )}

      {step === 2 && (
        <Question title="Who's your target customer?" subtitle="Be as specific as you can">
          <textarea
            autoFocus
            value={answers.targetCustomer}
            onChange={(e) => setAnswers({ ...answers, targetCustomer: e.target.value })}
            placeholder="e.g. Busy parents of toddlers in the US"
            rows={4}
            className="w-full resize-none rounded-2xl border border-border bg-surface p-4 text-[15px] text-foreground outline-none placeholder:text-muted-foreground focus:border-accent/60"
          />
        </Question>
      )}

      {step === 3 && (
        <Question title="What do you want to focus on first?" subtitle="Select as many as you like">
          <div className="space-y-2.5">
            {BUSINESS_FOCUS_OPTIONS.map((o) => (
              <SelectableCard
                key={o.key}
                label={o.label}
                selected={answers.focusAreas.includes(o.key)}
                onClick={() => setAnswers({ ...answers, focusAreas: toggle(answers.focusAreas, o.key) })}
              />
            ))}
          </div>
        </Question>
      )}

      {step === 4 && (
        <Question title="What are you already good at?" subtitle="Select as many as you like">
          <div className="space-y-2.5">
            {BUSINESS_STRENGTH_OPTIONS.map((o) => (
              <SelectableCard
                key={o.key}
                label={o.label}
                selected={answers.strengths.includes(o.key)}
                onClick={() => setAnswers({ ...answers, strengths: toggle(answers.strengths, o.key) })}
              />
            ))}
          </div>
        </Question>
      )}

      {step === 5 && (
        <Question title="How much time can you realistically commit?">
          <div className="space-y-2.5">
            {FREE_TIME_OPTIONS.map((o) => (
              <SelectableCard
                key={o.key}
                label={o.label}
                selected={answers.freeTime === o.key}
                onClick={() => setAnswers({ ...answers, freeTime: o.key })}
              />
            ))}
          </div>
        </Question>
      )}

      {step === 6 && (
        <Question title="What's your biggest goal right now?">
          <div className="space-y-2.5">
            {BUSINESS_GOAL_OPTIONS.map((o) => (
              <SelectableCard
                key={o.key}
                label={o.label}
                selected={answers.biggestGoal === o.key}
                onClick={() => setAnswers({ ...answers, biggestGoal: o.key })}
              />
            ))}
          </div>
        </Question>
      )}

      {step === 7 && (
        <Question title="What's your biggest problem right now?">
          <div className="space-y-2.5">
            {BUSINESS_PROBLEM_OPTIONS.map((o) => (
              <SelectableCard
                key={o.key}
                label={o.label}
                selected={answers.biggestProblem === o.key}
                onClick={() => setAnswers({ ...answers, biggestProblem: o.key })}
              />
            ))}
          </div>
        </Question>
      )}
    </OnboardingShell>
  );
}

function Question({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <h2 className="text-[22px] font-bold leading-snug tracking-tight text-foreground">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mt-6 scrollbar-none flex-1 overflow-y-auto pb-2">{children}</div>
    </div>
  );
}

function ResultsScreen({ answers, onContinue }: { answers: Answers; onContinue: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background px-6 pb-8 pt-16">
      <div className="bg-ambient-glow pointer-events-none absolute inset-x-0 top-0 h-72" aria-hidden />
      <div className="relative z-10 flex flex-1 flex-col">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Business Snapshot</p>
        <h1 className="mt-1 text-[26px] font-extrabold tracking-tight text-foreground">Your plan is ready to build.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {branding.name} will research your idea and set up a starter milestone checklist tailored to it.
        </p>

        <div className="mt-8 glass rounded-2xl p-4">
          <p className="text-sm font-semibold text-foreground">Your idea</p>
          <p className="mt-1 text-sm text-muted-foreground">{answers.businessIdea}</p>
        </div>
        <div className="mt-3 glass rounded-2xl p-4">
          <p className="text-sm font-semibold text-foreground">Target customer</p>
          <p className="mt-1 text-sm text-muted-foreground">{answers.targetCustomer}</p>
        </div>

        <div className="mt-auto pt-10">
          <Button size="lg" className="w-full" onClick={onContinue}>
            Build My Plan
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {branding.name} is a planning tool, not a guarantee of business or financial outcomes.
          </p>
        </div>
      </div>
    </div>
  );
}
