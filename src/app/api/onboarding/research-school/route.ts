import "server-only";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireUser } from "@/lib/supabase/server";
import { extractJSON, StudyAIError } from "@/lib/study/ai";
import { SUBJECT_OPTIONS } from "@/lib/catalog/onboarding-options";
import type { Priority } from "@/lib/types";

export const runtime = "nodejs";

const MODEL = process.env.FUTUREOS_MODEL || "claude-opus-5";

function subjectLabel(key: string): string {
  return SUBJECT_OPTIONS.find((s) => s.key === key)?.label ?? key;
}

interface ResearchedTimetableEntry {
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject: string;
  room: string | null;
}
interface ResearchedHomework {
  subject: string;
  title: string;
  due_in_days: number;
  priority: Priority;
}
interface ResearchedExam {
  subject: string;
  title: string;
  exam_in_days: number;
}
interface ResearchedStudySession {
  day_of_week: number;
  subject: string;
  duration_min: number;
}
interface ResearchResult {
  curriculumSummary: string;
  timetable: ResearchedTimetableEntry[];
  homework: ResearchedHomework[];
  exams: ResearchedExam[];
  studySessions: ResearchedStudySession[];
}

let cachedClient: Anthropic | null = null;
function anthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured on the server.");
  if (!cachedClient) cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

/**
 * Researches the real curriculum/exam system for a student's country + school
 * + year group (using web search), then generates a realistic starter
 * timetable, homework, exams, and study plan that actually matches how
 * school works there — instead of the generic canned rotation in
 * buildDemoData. The caller (completeOnboarding) falls back to
 * buildDemoData on any failure here, so onboarding never breaks on this.
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireUser(req);
  if (!user) return NextResponse.json({ error }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  let body: { country?: string; schoolName?: string; yearGroup?: string; subjects?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const country = (body.country ?? "").trim();
  const schoolName = (body.schoolName ?? "").trim();
  const yearGroup = (body.yearGroup ?? "").trim();
  const subjects = Array.isArray(body.subjects) ? body.subjects.slice(0, 6) : [];
  if (!country || !yearGroup) {
    return NextResponse.json({ error: "Missing country or year group." }, { status: 400 });
  }

  const subjectLabels = (subjects.length ? subjects : ["mathematics", "science", "english"]).map(subjectLabel);

  const system = `You are an education researcher who knows real school systems and curricula around the world. Given a student's country, school (if named), and year group, work out which real curriculum/exam board/grading system they are almost certainly following (e.g. GCSE/A-Level in the UK, a specific state curriculum in the US, IB, a national curriculum elsewhere). If a specific school is named, use web search to check for anything school-specific (term dates, subject names); otherwise reason from the country + year group alone. Then produce a realistic one-week starter timetable, a short list of pending homework, a couple of upcoming exams, and a weekly study plan that would plausibly belong to a real student in that system — using real subject/course naming conventions for that curriculum (e.g. "Biology GCSE" not generic "Science").

Respond with ONLY valid JSON, no prose, no markdown fences, matching exactly this shape:
{
  "curriculumSummary": "1-2 sentence description of the education system/curriculum you inferred and why",
  "timetable": [{ "day_of_week": 1-5 (Mon-Fri), "start_time": "HH:MM", "end_time": "HH:MM", "subject": "string", "room": null }],
  "homework": [{ "subject": "string", "title": "string", "due_in_days": integer 1-9, "priority": "high"|"medium"|"low" }],
  "exams": [{ "subject": "string", "title": "string", "exam_in_days": integer 10-25 }],
  "studySessions": [{ "day_of_week": 1-5, "subject": "string", "duration_min": integer 15-90 }]
}
Include 8-12 timetable entries, 4 homework items, 2 exams, and 5-7 study sessions. Keep subject names consistent with the subjects the student actually picked: ${subjectLabels.join(", ")}.`;

  const userText = `Country: ${country}\nSchool: ${schoolName || "not provided"}\nYear group: ${yearGroup}\nSubjects the student picked: ${subjectLabels.join(", ")}`;

  try {
    const response = await anthropicClient().messages.create({
      model: MODEL,
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: userText }],
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 3 }],
      output_config: { effort: "medium" },
    });

    const textBlock = response.content.find((b): b is Anthropic.Messages.TextBlock => b.type === "text");
    if (!textBlock) throw new StudyAIError("No text response.");
    const result = extractJSON<ResearchResult>(textBlock.text);

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Research failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
