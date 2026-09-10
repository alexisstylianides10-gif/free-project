"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { SelectableCard } from "@/components/shared/SelectableCard";
import { CountrySelect } from "@/components/shared/CountrySelect";
import { OnboardingShell } from "./OnboardingShell";
import {
  YEAR_OPTIONS,
  SUBJECT_OPTIONS,
  INTEREST_OPTIONS,
  STRENGTH_OPTIONS,
  EXPLORE_OPTIONS,
  FREE_TIME_OPTIONS,
  GOAL_OPTIONS,
  PROBLEM_OPTIONS,
} from "@/lib/catalog/onboarding-options";
import { CAREERS } from "@/lib/catalog/careers";
import { computeCareerMatches } from "@/lib/matching";
import { completeOnboarding, type FullOnboardingAnswers } from "@/lib/onboarding/completeOnboarding";
import { personalizedContext } from "@/lib/onboarding/personalize";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { branding } from "@/lib/branding";
import { useAuth } from "@/components/providers/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { LoadingScreen } from "@/components/shared/LoadingScreen";

type Answers = FullOnboardingAnswers;

const EMPTY_ANSWERS: Answers = {
  yearGroup: "",
  country: "",
  schoolName: "",
  subjects: [],
  interests: [],
  strengths: [],
  exploreGoals: [],
  freeTime: "",
  biggestGoal: "",
  biggestProblem: "",
  age: null,
};

function toggle(list: string[], key: string): string[] {
  return list.includes(key) ? list.filter((k) => k !== key) : [...list, key];
}

const QUESTION_COUNT = 11;

export default function StudentOnboarding() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const t = useTranslations("StudentOnboarding");
  const tOptions = useTranslations("OnboardingOptions");
  const tContext = useTranslations("OnboardingContext");
  const [step, setStep] = useState(0); // 0..9 = questions, 10 = results
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [submitting, setSubmitting] = useState(false);

  const matches = useMemo(
    () =>
      computeCareerMatches(
        {
          subjects: answers.subjects,
          interests: answers.interests,
          strengths: answers.strengths,
          exploreGoals: answers.exploreGoals,
        },
        4
      ),
    [answers]
  );

  const isValid = (() => {
    switch (step) {
      case 0:
        return answers.yearGroup !== "";
      case 1:
        return answers.country !== "";
      case 2:
        return answers.schoolName.trim() !== "";
      case 3:
        return answers.subjects.length > 0;
      case 4:
        return answers.interests.length > 0;
      case 5:
        return answers.strengths.length > 0;
      case 6:
        return answers.exploreGoals.length > 0;
      case 7:
        return answers.freeTime !== "";
      case 8:
        return answers.biggestGoal !== "";
      case 9:
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
      await completeOnboarding(supabase, user.id, profile?.full_name || "Student", answers);
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
    return <ResultsScreen matches={matches.map((m) => m.percent)} slugs={matches.map((m) => m.slug)} onContinue={buildMyPlan} />;
  }

  return (
    <OnboardingShell
      step={step}
      totalSteps={QUESTION_COUNT}
      onBack={back}
      track="student"
      footer={
        <Button size="lg" className="w-full" disabled={!isValid} onClick={next}>
          {t("continue")}
        </Button>
      }
    >
      {step === 0 && (
        <Question title={t("q0Title")}>
          <div className="grid grid-cols-2 gap-2.5">
            {YEAR_OPTIONS.map((o) => (
              <SelectableCard
                key={o.key}
                label={tOptions(`years.${o.key}`)}
                compact
                selected={answers.yearGroup === o.key}
                onClick={() => setAnswers({ ...answers, yearGroup: o.key })}
              />
            ))}
          </div>
        </Question>
      )}

      {step === 1 && (
        <Question title={t("q1Title")} context={personalizedContext(1, answers, tContext, tOptions)} className="flex-1 overflow-hidden">
          <CountrySelect value={answers.country} onChange={(country) => setAnswers({ ...answers, country })} />
        </Question>
      )}

      {step === 2 && (
        <Question title={t("q2Title")} subtitle={t("q2Subtitle")} context={personalizedContext(2, answers, tContext, tOptions)}>
          <Input
            autoFocus
            value={answers.schoolName}
            onChange={(e) => setAnswers({ ...answers, schoolName: e.target.value })}
            placeholder={t("q2Placeholder")}
            className="h-12 text-body"
          />
        </Question>
      )}

      {step === 3 && (
        <Question title={t("q3Title")} subtitle={t("selectAsManyAsYouLike")} context={personalizedContext(3, answers, tContext, tOptions)}>
          <OptionGrid
            options={SUBJECT_OPTIONS}
            group="subjects"
            t={tOptions}
            selected={answers.subjects}
            onToggle={(key) => setAnswers({ ...answers, subjects: toggle(answers.subjects, key) })}
          />
        </Question>
      )}

      {step === 4 && (
        <Question title={t("q4Title")} subtitle={t("selectAsManyAsYouLike")} context={personalizedContext(4, answers, tContext, tOptions)}>
          <OptionGrid
            options={INTEREST_OPTIONS}
            group="interests"
            t={tOptions}
            selected={answers.interests}
            onToggle={(key) => setAnswers({ ...answers, interests: toggle(answers.interests, key) })}
            showEmoji
          />
        </Question>
      )}

      {step === 5 && (
        <Question title={t("q5Title")} subtitle={t("selectAsManyAsYouLike")} context={personalizedContext(5, answers, tContext, tOptions)}>
          <OptionGrid
            options={STRENGTH_OPTIONS}
            group="strengths"
            t={tOptions}
            selected={answers.strengths}
            onToggle={(key) => setAnswers({ ...answers, strengths: toggle(answers.strengths, key) })}
          />
        </Question>
      )}

      {step === 6 && (
        <Question title={t("q6Title")} subtitle={t("selectAsManyAsYouLike")} context={personalizedContext(6, answers, tContext, tOptions)}>
          <OptionGrid
            options={EXPLORE_OPTIONS}
            group="explore"
            t={tOptions}
            selected={answers.exploreGoals}
            onToggle={(key) => setAnswers({ ...answers, exploreGoals: toggle(answers.exploreGoals, key) })}
          />
        </Question>
      )}

      {step === 7 && (
        <Question title={t("q7Title")} context={personalizedContext(7, answers, tContext, tOptions)}>
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

      {step === 8 && (
        <Question title={t("q8Title")} context={personalizedContext(8, answers, tContext, tOptions)}>
          <div className="space-y-2.5">
            {GOAL_OPTIONS.map((o) => (
              <SelectableCard
                key={o.key}
                label={tOptions(`goals.${o.key}`)}
                selected={answers.biggestGoal === o.key}
                onClick={() => setAnswers({ ...answers, biggestGoal: o.key })}
              />
            ))}
          </div>
        </Question>
      )}

      {step === 9 && (
        <Question title={t("q9Title")} context={personalizedContext(9, answers, tContext, tOptions)}>
          <div className="space-y-2.5">
            {PROBLEM_OPTIONS.map((o) => (
              <SelectableCard
                key={o.key}
                label={tOptions(`problems.${o.key}`)}
                selected={answers.biggestProblem === o.key}
                onClick={() => setAnswers({ ...answers, biggestProblem: o.key })}
              />
            ))}
          </div>
        </Question>
      )}

      {step === 10 && (
        <Question title={t("q10Title")} subtitle={t("q10Subtitle")}>
          <Input
            autoFocus
            type="number"
            inputMode="numeric"
            min={5}
            max={100}
            value={answers.age ?? ""}
            onChange={(e) => {
              const raw = e.target.value;
              setAnswers({ ...answers, age: raw === "" ? null : Number(raw) });
            }}
            placeholder={t("q10Placeholder")}
            className="h-12 text-body"
          />
        </Question>
      )}
    </OnboardingShell>
  );
}

function Question({
  title,
  subtitle,
  context,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  context?: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex h-full flex-col ${className ?? ""}`}>
      {context && <p className="mb-2 text-sm font-medium italic text-accent">{context}</p>}
      <h2 className="text-title font-bold leading-snug tracking-tight text-foreground">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mt-6 scrollbar-none flex-1 overflow-y-auto pb-2">{children}</div>
    </div>
  );
}

function OptionGrid({
  options,
  group,
  t,
  selected,
  onToggle,
  showEmoji,
}: {
  options: { key: string; label: string; emoji?: string }[];
  group: string;
  t: (key: string) => string;
  selected: string[];
  onToggle: (key: string) => void;
  showEmoji?: boolean;
}) {
  return (
    <div className="space-y-2.5">
      {options.map((o) => (
        <SelectableCard
          key={o.key}
          label={t(`${group}.${o.key}`)}
          icon={showEmoji ? o.emoji : undefined}
          selected={selected.includes(o.key)}
          onClick={() => onToggle(o.key)}
        />
      ))}
    </div>
  );
}

function ResultsScreen({ matches, slugs, onContinue }: { matches: number[]; slugs: string[]; onContinue: () => void }) {
  const t = useTranslations("StudentOnboarding");
  const careers = slugs.map((slug) => CAREERS.find((c) => c.slug === slug)).filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <div className="flex min-h-dvh flex-col bg-background px-6 pb-8 pt-16 md:px-10">
      <div className="bg-ambient-glow pointer-events-none absolute inset-x-0 top-0 h-72" aria-hidden />
      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col md:max-w-lg lg:max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">{t("futureMap")}</p>
        <h1 className="mt-1 text-heading font-extrabold tracking-tight text-foreground">{t("resultsTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("resultsSubtitle")}</p>

        <div className="mt-8 space-y-3">
          {careers.map((career, i) => (
            <Card key={career.slug}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2.5 text-body font-semibold text-foreground">
                    <career.icon className="h-5 w-5 text-accent" aria-hidden />
                    {career.name}
                  </span>
                  <span className="text-sm font-bold text-accent">{t("percentMatch", { percent: matches[i] })}</span>
                </div>
                <ProgressBar value={matches[i]} className="mt-3" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-auto pt-10">
          <Button size="lg" className="w-full" onClick={onContinue}>
            {t("buildMyPlan")}
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">{t("schoolFirstNote", { name: branding.name })}</p>
        </div>
      </div>
    </div>
  );
}
