"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Home, GraduationCap, Target, Compass, TrendingUp, Sparkles, CircleUserRound } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface TutorialStep {
  icon: LucideIcon;
  title: string;
  body: string;
}

/** Copy is track-specific, not shared/reused across tracks · same rule this
 * project already applies to onboarding question catalogs. One card per
 * nav tab (src/lib/navTabs.ts), same order, same icons as the real nav. */
function getTutorialSteps(track: "student" | "business"): TutorialStep[] {
  if (track === "business") {
    return [
      {
        icon: Home,
        title: "Home · your daily snapshot",
        body: "Your streak, XP, and today's plan, pulled from Plan and Grow, so you always know what to do first.",
      },
      {
        icon: Target,
        title: "Plan · your milestones",
        body: "Track the milestones that move your business forward, one at a time.",
      },
      {
        icon: TrendingUp,
        title: "Grow · your numbers and market",
        body: "Log your metrics and expenses, draft content, and keep an eye on your market.",
      },
      {
        icon: Sparkles,
        title: "Coach · ask it anything",
        body: "Not sure what to do next, or need to think through a decision? Your AI coach knows your business and your plan.",
      },
      {
        icon: CircleUserRound,
        title: "Profile · everything you've built",
        body: "Your stats, streak, and achievements, plus billing and account settings.",
      },
    ];
  }
  return [
    {
      icon: Home,
      title: "Home · your daily snapshot",
      body: "Your streak, XP, and today's plan, pulled from School and Future, so you always know what to do first.",
    },
    {
      icon: GraduationCap,
      title: "School · everything school-related",
      body: "Your classes, homework, exams, and an AI study coach that knows your subjects.",
    },
    {
      icon: Compass,
      title: "Future · where this is heading",
      body: "See your top career matches and follow a 6-level roadmap from exploring to building something real.",
    },
    {
      icon: Sparkles,
      title: "Coach · ask it anything",
      body: "Stuck on homework or not sure what's next? Your AI coach knows your subjects and your plan.",
    },
    {
      icon: CircleUserRound,
      title: "Profile · everything you've built",
      body: "Your stats, skills, streak, and achievements, plus billing and account settings.",
    },
  ];
}

export function NewUserTutorial({
  open,
  track,
  onFinish,
}: {
  open: boolean;
  track: "student" | "business";
  onFinish: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const steps = getTutorialSteps(track);
  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;
  const Icon = step.icon;

  // Any dismissal · X, overlay click, Escape, or reaching "Get started" on
  // the last card · is an equally valid "seen it" signal for a one-time
  // tour, so they all route through the same handler.
  function handleOpenChange(next: boolean) {
    if (!next) {
      setStepIndex(0);
      onFinish();
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title="Quick tour"
      description="Here's where everything lives. Takes about 20 seconds."
    >
      <div className="flex flex-col items-center py-2 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand">
          <Icon className="h-6 w-6 text-white" />
        </span>
        <h3 className="mt-4 text-base font-bold text-foreground">{step.title}</h3>
        <p className="mt-2 max-w-[32ch] text-sm leading-relaxed text-muted-foreground">{step.body}</p>
      </div>

      <div className="mt-6 flex gap-1.5">
        {steps.map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors duration-300",
              i <= stepIndex ? "bg-gradient-brand" : "bg-muted"
            )}
          />
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="md"
          onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
          className={stepIndex === 0 ? "invisible" : undefined}
        >
          Back
        </Button>
        {isLast ? (
          <Button size="md" onClick={() => handleOpenChange(false)}>
            Get started
          </Button>
        ) : (
          <Button size="md" onClick={() => setStepIndex((i) => i + 1)}>
            Next
          </Button>
        )}
      </div>
    </Modal>
  );
}
