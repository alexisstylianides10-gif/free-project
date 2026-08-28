"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
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
};

function toggle(list: string[], key: string): string[] {
  return list.includes(key) ? list.filter((k) => k !== key) : [...list, key];
}

const QUESTION_COUNT = 10;

export default function StudentOnboarding() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
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
    return <LoadingScreen message="Researching your school and building your plan — this can take up to a minute…" />;
  }

  if (step === QUESTION_COUNT) {
    return <ResultsScreen matches={matches.map((m) => m.percent)} slugs={matches.map((m) => m.slug)} onContinue={buildMyPlan} />;
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
        <Question title="What year are you in?">
          <div className="grid grid-cols-2 gap-2.5">
            {YEAR_OPTIONS.map((o) => (
              <SelectableCard
                key={o.key}
                label={o.label}
                compact
                selected={answers.yearGroup === o.key}
                onClick={() => setAnswers({ ...answers, yearGroup: o.key })}
              />
            ))}
          </div>
        </Question>
      )}

      {step === 1 && (
        <Question title="What country do you study in?" context={personalizedContext(1, answers)} className="flex-1 overflow-hidden">
          <CountrySelect value={answers.country} onChange={(country) => setAnswers({ ...answers, country })} />
        </Question>
      )}

      {step === 2 && (
        <Question title="What school do you go to?" subtitle="This helps us match your real timetable and curriculum" context={personalizedContext(2, answers)}>
          <input
            autoFocus
            value={answers.schoolName}
            onChange={(e) => setAnswers({ ...answers, schoolName: e.target.value })}
            placeholder="e.g. Lincoln High School"
            className="h-12 w-full rounded-2xl border border-border bg-surface px-4 text-body text-foreground outline-none placeholder:text-muted-foreground focus:border-accent/60"
          />
        </Question>
      )}

      {step === 3 && (
        <Question title="What subjects do you enjoy most?" subtitle="Select as many as you like" context={personalizedContext(3, answers)}>
          <OptionGrid
            options={SUBJECT_OPTIONS}
            selected={answers.subjects}
            onToggle={(key) => setAnswers({ ...answers, subjects: toggle(answers.subjects, key) })}
          />
        </Question>
      )}

      {step === 4 && (
        <Question title="What are you naturally interested in?" subtitle="Select as many as you like" context={personalizedContext(4, answers)}>
          <OptionGrid
            options={INTEREST_OPTIONS}
            selected={answers.interests}
            onToggle={(key) => setAnswers({ ...answers, interests: toggle(answers.interests, key) })}
            showEmoji
          />
        </Question>
      )}

      {step === 5 && (
        <Question title="What are you already good at?" subtitle="Select as many as you like" context={personalizedContext(5, answers)}>
          <OptionGrid
            options={STRENGTH_OPTIONS}
            selected={answers.strengths}
            onToggle={(key) => setAnswers({ ...answers, strengths: toggle(answers.strengths, key) })}
          />
        </Question>
      )}

      {step === 6 && (
        <Question title="What would you like to explore?" subtitle="Select as many as you like" context={personalizedContext(6, answers)}>
          <OptionGrid
            options={EXPLORE_OPTIONS}
            selected={answers.exploreGoals}
            onToggle={(key) => setAnswers({ ...answers, exploreGoals: toggle(answers.exploreGoals, key) })}
          />
        </Question>
      )}

      {step === 7 && (
        <Question title="How much free time do you realistically have after school?" context={personalizedContext(7, answers)}>
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

      {step === 8 && (
        <Question title="What is your biggest goal right now?" context={personalizedContext(8, answers)}>
          <div className="space-y-2.5">
            {GOAL_OPTIONS.map((o) => (
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

      {step === 9 && (
        <Question title="What is your biggest problem?" context={personalizedContext(9, answers)}>
          <div className="space-y-2.5">
            {PROBLEM_OPTIONS.map((o) => (
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
  selected,
  onToggle,
  showEmoji,
}: {
  options: { key: string; label: string; emoji?: string }[];
  selected: string[];
  onToggle: (key: string) => void;
  showEmoji?: boolean;
}) {
  return (
    <div className="space-y-2.5">
      {options.map((o) => (
        <SelectableCard
          key={o.key}
          label={o.label}
          icon={showEmoji ? o.emoji : undefined}
          selected={selected.includes(o.key)}
          onClick={() => onToggle(o.key)}
        />
      ))}
    </div>
  );
}

function ResultsScreen({ matches, slugs, onContinue }: { matches: number[]; slugs: string[]; onContinue: () => void }) {
  const careers = slugs.map((slug) => CAREERS.find((c) => c.slug === slug)).filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <div className="flex min-h-dvh flex-col bg-background px-6 pb-8 pt-16 md:px-10">
      <div className="bg-ambient-glow pointer-events-none absolute inset-x-0 top-0 h-72" aria-hidden />
      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col md:max-w-lg lg:max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Future Map</p>
        <h1 className="mt-1 text-heading font-extrabold tracking-tight text-foreground">Your Future Map is ready.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Based on your answers, here are the directions where you&rsquo;re most likely to thrive.
        </p>

        <div className="mt-8 space-y-3">
          {careers.map((career, i) => (
            <div key={career.slug} className="glass rounded-2xl p-4 shadow-card">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2.5 text-body font-semibold text-foreground">
                  <span className="text-xl">{career.icon}</span>
                  {career.name}
                </span>
                <span className="text-sm font-bold text-accent">{matches[i]}% match</span>
              </div>
              <ProgressBar value={matches[i]} className="mt-3" />
            </div>
          ))}
        </div>

        <div className="mt-auto pt-10">
          <Button size="lg" className="w-full" onClick={onContinue}>
            Build My Plan
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            School always comes first — {branding.name} fits around it, never instead of it.
          </p>
        </div>
      </div>
    </div>
  );
}
