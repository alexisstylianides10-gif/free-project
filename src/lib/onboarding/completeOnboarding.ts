import type { SupabaseClient } from "@supabase/supabase-js";
import { computeCareerMatches } from "@/lib/matching";
import { buildDemoData, type DemoDataResult } from "@/lib/seed/demoData";
import { researchSchoolData } from "@/lib/onboarding/researchSchool";
import { todayISO } from "@/lib/utils";

export interface FullOnboardingAnswers {
  yearGroup: string;
  country: string;
  schoolName: string;
  subjects: string[];
  interests: string[];
  strengths: string[];
  exploreGoals: string[];
  freeTime: string;
  biggestGoal: string;
  biggestProblem: string;
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

  let curriculumSummary: string | null = null;
  let seedData: DemoDataResult;
  try {
    const researched = await researchSchoolData({
      country: answers.country,
      schoolName: answers.schoolName,
      yearGroup: answers.yearGroup,
      subjects: answers.subjects,
      userId,
      freeTime: answers.freeTime,
    });
    seedData = researched.data;
    curriculumSummary = researched.curriculumSummary;
  } catch {
    seedData = buildDemoData({ userId, subjects: answers.subjects, freeTime: answers.freeTime });
  }
  const { timetable, homework, exams, studySessions } = seedData;

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
        school_name: answers.schoolName,
        curriculum_summary: curriculumSummary,
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
