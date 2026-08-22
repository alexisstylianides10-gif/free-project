import { authedFetch } from "@/lib/api";
import { addDaysISO, todayISO, mondayOfThisWeek } from "@/lib/utils";
import type { DemoDataResult } from "@/lib/seed/demoData";
import type { Priority } from "@/lib/types";

interface ResearchApiResponse {
  curriculumSummary?: string;
  timetable?: { day_of_week: number; start_time: string; end_time: string; subject: string; room: string | null }[];
  homework?: { subject: string; title: string; due_in_days: number; priority: Priority }[];
  exams?: { subject: string; title: string; exam_in_days: number }[];
  studySessions?: { day_of_week: number; subject: string; duration_min: number }[];
  error?: string;
}

/**
 * Calls /api/onboarding/research-school (Claude + web search) to work out
 * the real curriculum a student is likely following, then converts the
 * AI's relative day offsets into real ISO dates. Throws on any failure or
 * malformed response — completeOnboarding falls back to buildDemoData so
 * onboarding never gets stuck on this.
 */
export async function researchSchoolData(params: {
  country: string;
  schoolName: string;
  yearGroup: string;
  subjects: string[];
  freeTime: string;
  userId: string;
}): Promise<{ data: DemoDataResult; curriculumSummary: string }> {
  // Bounded to 20s: this AI call runs web search and can genuinely take
  // 30s+, but onboarding must never hang on it — completeOnboarding's
  // catch below falls back to buildDemoData on a timeout just like any
  // other failure here.
  const res = await authedFetch(
    "/api/onboarding/research-school",
    {
      method: "POST",
      body: JSON.stringify({
        country: params.country,
        schoolName: params.schoolName,
        yearGroup: params.yearGroup,
        subjects: params.subjects,
      }),
    },
    20000
  );
  if (!res.ok) throw new Error("Research request failed.");

  const body = (await res.json()) as ResearchApiResponse;
  if (
    !body.curriculumSummary ||
    !Array.isArray(body.timetable) ||
    !Array.isArray(body.homework) ||
    !Array.isArray(body.exams) ||
    !Array.isArray(body.studySessions) ||
    body.timetable.length === 0
  ) {
    throw new Error("Malformed research response.");
  }

  const { userId } = params;
  const today = todayISO();
  const weekStart = mondayOfThisWeek();

  const data: DemoDataResult = {
    timetable: body.timetable.map((t) => ({
      user_id: userId,
      day_of_week: t.day_of_week,
      start_time: t.start_time,
      end_time: t.end_time,
      subject: t.subject,
      room: t.room ?? null,
    })),
    homework: body.homework.map((h) => ({
      user_id: userId,
      subject: h.subject,
      title: h.title,
      due_date: addDaysISO(today, h.due_in_days),
      priority: h.priority,
      status: "pending" as const,
    })),
    exams: body.exams.map((e) => ({
      user_id: userId,
      subject: e.subject,
      title: e.title,
      exam_date: addDaysISO(today, e.exam_in_days),
    })),
    studySessions: body.studySessions.map((s) => ({
      user_id: userId,
      week_start: weekStart,
      day_of_week: s.day_of_week,
      subject: s.subject,
      duration_min: s.duration_min,
      completed: false,
    })),
  };

  return { data, curriculumSummary: body.curriculumSummary };
}
