import {
  Option,
  YEAR_OPTIONS,
  SUBJECT_OPTIONS,
  INTEREST_OPTIONS,
  STRENGTH_OPTIONS,
  EXPLORE_OPTIONS,
  FREE_TIME_OPTIONS,
  GOAL_OPTIONS,
} from "@/lib/catalog/onboarding-options";
import type { FullOnboardingAnswers } from "@/lib/onboarding/completeOnboarding";

function labelOf(options: Option[], key: string): string {
  return options.find((o) => o.key === key)?.label ?? key;
}

/** "Maths" / "Maths and Science" / "Maths, Science and 2 more" */
function formatList(labels: string[], max = 2): string {
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  if (labels.length <= max) return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
  const shown = labels.slice(0, max);
  const rest = labels.length - max;
  return `${shown.join(", ")} and ${rest} more`;
}

/**
 * A short, italic "callback" line shown above each onboarding question,
 * referencing what the student just told us — so the questionnaire reads
 * like a conversation building on itself rather than nine unrelated forms.
 * Returns null for the first question (nothing to reference yet).
 */
export function personalizedContext(step: number, a: FullOnboardingAnswers): string | null {
  switch (step) {
    case 1: {
      if (!a.yearGroup) return null;
      const year = labelOf(YEAR_OPTIONS, a.yearGroup);
      return `${year} — let's find out where you're studying.`;
    }
    case 2: {
      if (!a.country) return null;
      return `Got it, ${a.country}. What school do you go to?`;
    }
    case 3: {
      if (!a.schoolName.trim()) return null;
      return `${a.schoolName} — noted. What subjects do you enjoy most?`;
    }
    case 4: {
      if (a.subjects.length === 0) return null;
      return `You're into ${formatList(a.subjects.map((s) => labelOf(SUBJECT_OPTIONS, s)))} — what pulls you in beyond the classroom?`;
    }
    case 5: {
      if (a.interests.length === 0) return null;
      return `Since you're drawn to ${formatList(a.interests.map((s) => labelOf(INTEREST_OPTIONS, s)))}, what are you already good at?`;
    }
    case 6: {
      if (a.strengths.length === 0) return null;
      return `With strengths like ${formatList(a.strengths.map((s) => labelOf(STRENGTH_OPTIONS, s)))}, what do you want to explore?`;
    }
    case 7: {
      if (a.exploreGoals.length === 0) return null;
      return `Building toward ${formatList(a.exploreGoals.map((s) => labelOf(EXPLORE_OPTIONS, s)))} takes real time — how much do you actually have?`;
    }
    case 8: {
      if (!a.freeTime) return null;
      const freeTime = labelOf(FREE_TIME_OPTIONS, a.freeTime);
      return `${freeTime} a day, noted. What's the one thing you most want to move forward?`;
    }
    case 9: {
      if (!a.biggestGoal) return null;
      const goal = labelOf(GOAL_OPTIONS, a.biggestGoal).toLowerCase();
      return `Got it — ${goal}. What's most likely to get in your way?`;
    }
    default:
      return null;
  }
}
