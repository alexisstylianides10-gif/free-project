import type { SupabaseClient } from "@supabase/supabase-js";
import { computeCareerMatches } from "@/lib/matching";
import { buildDemoData } from "@/lib/seed/demoData";
import { todayISO } from "@/lib/utils";

export interface FullOnboardingAnswers {
  yearGroup: string;
  country: string;
  subjects: string[];
  interests: string[];
  strengths: string[];
  exploreGoals: string[];
  freeTime: string;
  biggestGoal: string;
  biggestProblem: string;
}

const PENDING_KEY = "futureos_pending_onboarding";

export function savePendingOnboarding(answers: FullOnboardingAnswers) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PENDING_KEY, JSON.stringify(answers));
}

export function loadPendingOnboarding(): FullOnboardingAnswers | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(PENDING_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FullOnboardingAnswers;
  } catch {
    return null;
  }
}

export function clearPendingOnboarding() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PENDING_KEY);
}

function baselineSkills(strengths: string[]): { skill_key: string; proficiency: number }[] {
  const picked = strengths.slice(0, 5);
  const fillers = ["communication", "problem_solving", "organisation"].filter((k) => !picked.includes(k));
  const keys = [...picked, ...fillers].slice(0, Math.max(4, picked.length));
  return keys.map((key, i) => ({
    skill_key: key,
    proficiency: picked.includes(key) ? 55 + ((i * 7) % 20) : 20 + ((i * 5) % 15),
  }));
}

/**
 * Writes everything a freshly-onboarded student needs in one pass: profile,
 * onboarding answers + computed career matches, a starter career path, a
 * realistic demo timetable/homework/exams/study-plan, baseline skills, and
 * the "Career Path Chosen" achievement. Idempotent via upsert, so it's safe
 * to call again if a page reload interrupts the first attempt.
 */
export async function completeOnboarding(
  supabase: SupabaseClient,
  userId: string,
  fullName: string,
  answers: FullOnboardingAnswers
): Promise<void> {
  const matches = computeCareerMatches({
    subjects: answers.subjects,
    interests: answers.interests,
    strengths: answers.strengths,
    exploreGoals: answers.exploreGoals,
  });
  const topMatch = matches[0];

  const { timetable, homework, exams, studySessions } = buildDemoData({
    userId,
    subjects: answers.subjects,
    freeTime: answers.freeTime,
  });

  await Promise.all([
    supabase.from("profiles").upsert(
      {
        id: userId,
        full_name: fullName,
        year_group: answers.yearGroup,
        country: answers.country,
        onboarding_completed: true,
        streak_count: 1,
        longest_streak: 1,
        last_active_date: todayISO(),
        xp_school: 15,
        xp_career: topMatch ? 30 : 15,
        xp_skill: 10,
      },
      { onConflict: "id" }
    ),
    supabase.from("onboarding_responses").upsert(
      {
        user_id: userId,
        year_group: answers.yearGroup,
        country: answers.country,
        subjects: answers.subjects,
        interests: answers.interests,
        strengths: answers.strengths,
        explore_goals: answers.exploreGoals,
        free_time: answers.freeTime,
        biggest_goal: answers.biggestGoal,
        biggest_problem: answers.biggestProblem,
        top_matches: matches,
      },
      { onConflict: "user_id" }
    ),
  ]);

  const inserts: PromiseLike<unknown>[] = [];

  if (topMatch) {
    inserts.push(
      supabase.from("career_paths").upsert(
        { user_id: userId, career_slug: topMatch.slug, match_percent: topMatch.percent, is_primary: true },
        { onConflict: "user_id,career_slug" }
      )
    );
    inserts.push(supabase.from("user_achievements").upsert({ user_id: userId, achievement_key: "career_path_chosen" }, { onConflict: "user_id,achievement_key" }));
  }

  if (timetable.length) inserts.push(supabase.from("timetable_entries").insert(timetable));
  if (homework.length) inserts.push(supabase.from("homework").insert(homework));
  if (exams.length) inserts.push(supabase.from("exams").insert(exams));
  if (studySessions.length) inserts.push(supabase.from("study_sessions").insert(studySessions));

  const skills = baselineSkills(answers.strengths);
  if (skills.length) {
    inserts.push(
      supabase.from("user_skills").upsert(
        skills.map((s) => ({ user_id: userId, ...s })),
        { onConflict: "user_id,skill_key" }
      )
    );
  }

  inserts.push(
    supabase.from("roadmap_progress").upsert(
      [
        { user_id: userId, level_number: 1, unlocked: true, completed_at: new Date().toISOString() },
        { user_id: userId, level_number: 2, unlocked: true, completed_at: null },
      ],
      { onConflict: "user_id,level_number" }
    )
  );

  await Promise.all(inserts);
}
