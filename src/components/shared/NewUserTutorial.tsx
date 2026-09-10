"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Home, GraduationCap, Target, Compass, TrendingUp, Sparkles, CircleUserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface TutorialStep {
  icon: LucideIcon;
  titleKey: string;
  bodyKey: string;
}

/** Copy is track-specific, not shared/reused across tracks · same rule this
 * project already applies to onboarding question catalogs. One card per
 * nav tab (src/lib/navTabs.ts), same order, same icons as the real nav.
 * Actual copy lives in the "NewUserTutorial" i18n namespace, keyed by
 * track + step index, so it can't drift from the icons/order below. */
function getTutorialSteps(track: "student" | "business"): TutorialStep[] {
  if (track === "business") {
    return [
      { icon: Home, titleKey: "business.0.title", bodyKey: "business.0.body" },
      { icon: Target, titleKey: "business.1.title", bodyKey: "business.1.body" },
      { icon: TrendingUp, titleKey: "business.2.title", bodyKey: "business.2.body" },
      { icon: Sparkles, titleKey: "business.3.title", bodyKey: "business.3.body" },
      { icon: CircleUserRound, titleKey: "business.4.title", bodyKey: "business.4.body" },
    ];
  }
  return [
    { icon: Home, titleKey: "student.0.title", bodyKey: "student.0.body" },
    { icon: GraduationCap, titleKey: "student.1.title", bodyKey: "student.1.body" },
    { icon: Compass, titleKey: "student.2.title", bodyKey: "student.2.body" },
    { icon: Sparkles, titleKey: "student.3.title", bodyKey: "student.3.body" },
    { icon: CircleUserRound, titleKey: "student.4.title", bodyKey: "student.4.body" },
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
  const t = useTranslations("NewUserTutorial");
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
      title={t("quickTourTitle")}
      description={t("quickTourDescription")}
    >
      <div className="flex flex-col items-center py-2 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand">
          <Icon className="h-6 w-6 text-white" />
        </span>
        <h3 className="mt-4 text-base font-bold text-foreground">{t(step.titleKey)}</h3>
        <p className="mt-2 max-w-[32ch] text-sm leading-relaxed text-muted-foreground">{t(step.bodyKey)}</p>
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
          {t("back")}
        </Button>
        {isLast ? (
          <Button size="md" onClick={() => handleOpenChange(false)}>
            {t("getStarted")}
          </Button>
        ) : (
          <Button size="md" onClick={() => setStepIndex((i) => i + 1)}>
            {t("next")}
          </Button>
        )}
      </div>
    </Modal>
  );
}
