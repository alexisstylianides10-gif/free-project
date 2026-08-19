import { addDaysISO, todayISO, mondayOfThisWeek } from "@/lib/utils";
import { SUBJECT_OPTIONS } from "@/lib/catalog/onboarding-options";
import type { Priority } from "@/lib/types";

function subjectLabel(key: string): string {
  return SUBJECT_OPTIONS.find((s) => s.key === key)?.label ?? key;
}

const FREE_TIME_MINUTES: Record<string, number> = {
  under_30: 25,
  "30_60": 45,
  "1_2h": 75,
  "2_3h": 120,
  "3h_plus": 150,
};

export interface DemoDataInput {
  userId: string;
  subjects: string[]; // subject keys from onboarding
  freeTime: string; // free-time key from onboarding
}

export interface DemoDataResult {
  timetable: { user_id: string; day_of_week: number; start_time: string; end_time: string; subject: string; room: string | null }[];
  homework: { user_id: string; subject: string; title: string; due_date: string; priority: Priority; status: "pending" | "completed" }[];
  exams: { user_id: string; subject: string; title: string; exam_date: string }[];
  studySessions: { user_id: string; week_start: string; day_of_week: number; subject: string; duration_min: number; completed: boolean }[];
}

const FALLBACK_SUBJECTS = ["mathematics", "science", "english"];

const ASSIGNMENT_TITLES: Record<string, string[]> = {
  mathematics: ["Quadratic Equations", "Algebra Practice Set", "Trigonometry Worksheet"],
  science: ["Lab Report", "Cell Division Notes", "Energy & Forces Questions"],
  computer_science: ["Python Functions Exercise", "Algorithm Flowchart", "Mini Coding Project"],
  business: ["Market Research Summary", "SWOT Analysis", "Business Plan Draft"],
  economics: ["Supply & Demand Case Study", "Macroeconomics Essay"],
  english: ["Essay Draft", "Poetry Analysis", "Reading Response"],
  languages: ["Vocabulary Test Prep", "Grammar Worksheet"],
  history: ["Source Analysis", "Timeline Project"],
  geography: ["Case Study Write-up", "Map Skills Worksheet"],
  art: ["Sketchbook Pages", "Final Piece Draft"],
  design: ["Design Brief Response", "Prototype Sketches"],
  pe: ["Fitness Log", "Performance Analysis"],
  other: ["Homework Task"],
};

function assignmentTitle(subjectKey: string, i: number): string {
  const titles = ASSIGNMENT_TITLES[subjectKey] ?? ASSIGNMENT_TITLES.other;
  return titles[i % titles.length];
}

/** Builds a realistic starter dataset — timetable, homework, exams, and an
 * AI-style weekly study plan — tailored to the subjects a student picked
 * during onboarding, so the app feels alive from the first screen instead
 * of showing empty states everywhere. */
export function buildDemoData({ userId, subjects, freeTime }: DemoDataInput): DemoDataResult {
  const chosen = subjects.length > 0 ? subjects.slice(0, 6) : FALLBACK_SUBJECTS;
  const today = todayISO();
  const weekStart = mondayOfThisWeek();
  const perSessionMinutes = FREE_TIME_MINUTES[freeTime] ?? 45;

  // --- Timetable: Mon-Fri, one class per weekday rotating through subjects.
  const periods = ["08:30", "09:30", "10:45", "11:45", "13:30"];
  const timetable: DemoDataResult["timetable"] = [];
  for (let day = 1; day <= 5; day++) {
    const count = day <= 3 ? 3 : 2;
    for (let p = 0; p < count; p++) {
      const subjectKey = chosen[(day + p) % chosen.length];
      const start = periods[p];
      const [h, m] = start.split(":").map(Number);
      const endMinutes = h * 60 + m + 50;
      const end = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
      timetable.push({
        user_id: userId,
        day_of_week: day,
        start_time: start,
        end_time: end,
        subject: subjectLabel(subjectKey),
        room: null,
      });
    }
  }

  // --- Homework: 4 items across the next 1-9 days.
  const priorities: Priority[] = ["high", "medium", "medium", "low"];
  const dueOffsets = [1, 2, 4, 7];
  const homework: DemoDataResult["homework"] = chosen.slice(0, 4).map((subjectKey, i) => ({
    user_id: userId,
    subject: subjectLabel(subjectKey),
    title: assignmentTitle(subjectKey, 0),
    due_date: addDaysISO(today, dueOffsets[i % dueOffsets.length]),
    priority: priorities[i % priorities.length],
    status: "pending" as const,
  }));

  // --- Exams: 2 upcoming, spaced out.
  const examOffsets = [12, 19];
  const exams: DemoDataResult["exams"] = chosen.slice(0, 2).map((subjectKey, i) => ({
    user_id: userId,
    subject: subjectLabel(subjectKey),
    title: `${subjectLabel(subjectKey)} Exam`,
    exam_date: addDaysISO(today, examOffsets[i % examOffsets.length]),
  }));

  // --- AI-style weekly study plan: Mon-Fri, 1-2 subjects/day, scaled to
  // however much free time the student said they realistically have.
  const studySessions: DemoDataResult["studySessions"] = [];
  for (let day = 1; day <= 5; day++) {
    const subjectsToday = day % 2 === 0 ? 1 : 2;
    for (let s = 0; s < subjectsToday; s++) {
      const subjectKey = chosen[(day + s * 2) % chosen.length];
      studySessions.push({
        user_id: userId,
        week_start: weekStart,
        day_of_week: day,
        subject: subjectLabel(subjectKey),
        duration_min: Math.max(15, Math.round((perSessionMinutes / subjectsToday) / 5) * 5),
        completed: false,
      });
    }
  }

  return { timetable, homework, exams, studySessions };
}
