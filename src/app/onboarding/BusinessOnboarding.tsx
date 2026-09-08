"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
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
  const t = useTranslations("BusinessOnboarding");
  const tOptions = useTranslations("OnboardingOptions");
  const [step, setStep] = useState(0); // 0..7 = questions, 8 = results
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [submitting, setSubmitting] = useState(false);

  const isValid = (() => {
    switch (step) {
      case 0:
        // Optional: a founder without an idea yet can still continue —
        // the AI suggests one later, grounded in their strengths/focus.
        return true;
      case 1:
        return Boolean(answers.stage);
      case 2:
        // Also optional, for the same no-idea-yet reason as step 0.
        return true;
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
    return <LoadingScreen message={t("buildingPlan")} />;
  }

  if (step === QUESTION_COUNT) {
    return <ResultsScreen answers={answers} onContinue={buildMyPlan} />;
  }

  return (
    <OnboardingShell
      step={step}
      totalSteps={QUESTION_COUNT}
      onBack={back}
      track="business"
      footer={
        <Button size="lg" className="w-full" disabled={!isValid} onClick={next}>
          {t("continue")}
        </Button>
      }
    >
      {step === 0 && (
        <Question title={t("q0Title")} subtitle={t("q0Subtitle")}>
          <Textarea
            autoFocus
            value={answers.businessIdea}
            onChange={(e) => setAnswers({ ...answers, businessIdea: e.target.value })}
            placeholder={t("q0Placeholder")}
            rows={5}
            className="resize-none text-body"
          />
        </Question>
      )}

      {step === 1 && (
        <Question title={t("q1Title")}>
          <div className="space-y-2.5">
            {BUSINESS_STAGE_OPTIONS.map((o) => (
              <SelectableCard
                key={o.key}
                label={tOptions(`businessStage.${o.key}`)}
                selected={answers.stage === o.key}
                onClick={() => setAnswers({ ...answers, stage: o.key as Answers["stage"] })}
              />
            ))}
          </div>
        </Question>
      )}

      {step === 2 && (
        <Question title={t("q2Title")} subtitle={t("q2Subtitle")}>
          <Textarea
            autoFocus
            value={answers.targetCustomer}
            onChange={(e) => setAnswers({ ...answers, targetCustomer: e.target.value })}
            placeholder={t("q2Placeholder")}
            rows={4}
            className="resize-none text-body"
          />
        </Question>
      )}

      {step === 3 && (
        <Question title={t("q3Title")} subtitle={t("selectAsManyAsYouLike")}>
          <div className="space-y-2.5">
            {BUSINESS_FOCUS_OPTIONS.map((o) => (
              <SelectableCard
                key={o.key}
                label={tOptions(`businessFocus.${o.key}`)}
                selected={answers.focusAreas.includes(o.key)}
                onClick={() => setAnswers({ ...answers, focusAreas: toggle(answers.focusAreas, o.key) })}
              />
            ))}
          </div>
        </Question>
      )}

      {step === 4 && (
        <Question title={t("q4Title")} subtitle={t("selectAsManyAsYouLike")}>
          <div className="space-y-2.5">
            {BUSINESS_STRENGTH_OPTIONS.map((o) => (
              <SelectableCard
                key={o.key}
                label={tOptions(`businessStrengths.${o.key}`)}
                selected={answers.strengths.includes(o.key)}
                onClick={() => setAnswers({ ...answers, strengths: toggle(answers.strengths, o.key) })}
              />
            ))}
          </div>
        </Question>
      )}

      {step === 5 && (
        <Question title={t("q5Title")}>
          <div className="space-y-2.5">
            {FREE_TIME_OPTIONS.map((o) => (
              <SelectableCard
                key={o.key}
                label={tOptions(`freeTime.${o.key}`)}
                selected={answers.freeTime === o.key}
                onClick={() => setAnswers({ ...answers, freeTime: o.key })}
              />
            ))}
          </div>
        </Question>
      )}

      {step === 6 && (
        <Question title={t("q6Title")}>
          <div className="space-y-2.5">
            {BUSINESS_GOAL_OPTIONS.map((o) => (
              <SelectableCard
                key={o.key}
                label={tOptions(`businessGoals.${o.key}`)}
                selected={answers.biggestGoal === o.key}
                onClick={() => setAnswers({ ...answers, biggestGoal: o.key })}
              />
            ))}
          </div>
        </Question>
      )}

      {step === 7 && (
        <Question title={t("q7Title")}>
          <div className="space-y-2.5">
            {BUSINESS_PROBLEM_OPTIONS.map((o) => (
              <SelectableCard
                key={o.key}
                label={tOptions(`businessProblems.${o.key}`)}
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
      <h2 className="text-title font-bold leading-snug tracking-tight text-foreground">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mt-6 scrollbar-none flex-1 overflow-y-auto pb-2">{children}</div>
    </div>
  );
}

function ResultsScreen({ answers, onContinue }: { answers: Answers; onContinue: () => void }) {
  const t = useTranslations("BusinessOnboarding");
  return (
    <div className="flex min-h-dvh flex-col bg-background px-6 pb-8 pt-16 md:px-10">
      <div className="bg-ambient-glow pointer-events-none absolute inset-x-0 top-0 h-72" aria-hidden />
      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col md:max-w-lg lg:max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">{t("businessSnapshot")}</p>
        <h1 className="mt-1 text-heading font-extrabold tracking-tight text-foreground">{t("resultsTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {answers.businessIdea.trim() ? t("resultsSubtitleWithIdea", { name: branding.name }) : t("resultsSubtitleNoIdea", { name: branding.name })}
        </p>

        <Card className="mt-8">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-foreground">{t("yourIdea")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{answers.businessIdea.trim() || t("noIdeaYet")}</p>
          </CardContent>
        </Card>
        <Card className="mt-3">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-foreground">{t("targetCustomer")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{answers.targetCustomer.trim() || t("noCustomerYet")}</p>
          </CardContent>
        </Card>

        <div className="mt-auto pt-10">
          <Button size="lg" className="w-full" onClick={onContinue}>
            {t("buildMyPlan")}
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">{t("planningToolNote", { name: branding.name })}</p>
        </div>
      </div>
    </div>
  );
}
