import type { FullOnboardingAnswers } from "@/lib/onboarding/completeOnboarding";

/** Looks up the translated label for an onboarding option key via the
 * "OnboardingOptions" i18n namespace (see StudentOnboarding.tsx/
 * BusinessOnboarding.tsx for the `useTranslations("OnboardingOptions")`
 * caller). `group` is the sub-namespace (e.g. "subjects", "interests"). */
function labelOf(t: (key: string) => string, group: string, key: string): string {
  return key ? t(`${group}.${key}`) : key;
}

/** "Maths" / "Maths and Science" / "Maths, Science and 2 more" — join style
 * matches the caller's locale via the "OnboardingContext" namespace's own
 * `listTwo`/`listMore` templates, rather than a hardcoded English "and". */
function formatList(t: (key: string, values?: Record<string, string | number>) => string, labels: string[], max = 2): string {
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  if (labels.length <= max) {
    return t("listTwo", { a: labels.slice(0, -1).join(", "), b: labels[labels.length - 1] });
  }
  const shown = labels.slice(0, max);
  const rest = labels.length - max;
  return t("listMore", { shown: shown.join(", "), rest });
}

/**
 * A short, italic "callback" line shown above each onboarding question,
 * referencing what the student just told us — so the questionnaire reads
 * like a conversation building on itself rather than nine unrelated forms.
 * Returns null for the first question (nothing to reference yet).
 *
 * `t` reads from the "OnboardingContext" i18n namespace (ICU sentence
 * templates); `tOptions` reads from "OnboardingOptions" (the same
 * per-key option labels StudentOnboarding.tsx uses for the question cards
 * themselves), so this line is always in the same language as the rest of
 * the onboarding flow.
 */
export function personalizedContext(
  step: number,
  a: FullOnboardingAnswers,
  t: (key: string, values?: Record<string, string | number>) => string,
  tOptions: (key: string) => string
): string | null {
  switch (step) {
    case 1: {
      if (!a.yearGroup) return null;
      const year = labelOf(tOptions, "years", a.yearGroup);
      return t("afterYear", { year });
    }
    case 2: {
      if (!a.country) return null;
      return t("afterCountry", { country: a.country });
    }
    case 3: {
      if (!a.schoolName.trim()) return null;
      return t("afterSchool", { school: a.schoolName });
    }
    case 4: {
      if (a.subjects.length === 0) return null;
      return t("afterSubjects", { subjects: formatList(t, a.subjects.map((s) => labelOf(tOptions, "subjects", s))) });
    }
    case 5: {
      if (a.interests.length === 0) return null;
      return t("afterInterests", { interests: formatList(t, a.interests.map((s) => labelOf(tOptions, "interests", s))) });
    }
    case 6: {
      if (a.strengths.length === 0) return null;
      return t("afterStrengths", { strengths: formatList(t, a.strengths.map((s) => labelOf(tOptions, "strengths", s))) });
    }
    case 7: {
      if (a.exploreGoals.length === 0) return null;
      return t("afterExplore", { explore: formatList(t, a.exploreGoals.map((s) => labelOf(tOptions, "explore", s))) });
    }
    case 8: {
      if (!a.freeTime) return null;
      const freeTime = labelOf(tOptions, "freeTime", a.freeTime);
      return t("afterFreeTime", { freeTime });
    }
    case 9: {
      if (!a.biggestGoal) return null;
      const goal = labelOf(tOptions, "goals", a.biggestGoal).toLowerCase();
      return t("afterGoal", { goal });
    }
    default:
      return null;
  }
}
