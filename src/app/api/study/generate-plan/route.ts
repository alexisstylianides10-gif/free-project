import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { callStudyAIForJSON } from "@/lib/study/ai";
import { todayISO, daysBetween, clamp } from "@/lib/utils";
import type { StudyTopic } from "@/lib/study/types";

export const runtime = "nodejs";

interface GeneratePlanBody {
  subjectId?: string;
  examId?: string;
  materialId?: string;
  daysAvailable?: number;
  minutesPerDay?: number;
}

interface AIPlanDay {
  day_index: number;
  topic_name: string;
  duration_min: number;
}

/** Loosely matches an AI-generated day label back to a real topic by name
 * (case-insensitive, ignores punctuation) — "Practice Exam" / "Weak Topics
 * Review" style days intentionally won't match anything, which is correct:
 * those days get topic_id: null and just a descriptive label. */
function matchTopic(topicName: string, topics: StudyTopic[]): StudyTopic | null {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const target = norm(topicName);
  if (!target) return null;
  return (
    topics.find((t) => norm(t.name) === target) ??
    topics.find((t) => norm(t.name).includes(target) || target.includes(norm(t.name))) ??
    null
  );
}

export async function POST(req: NextRequest) {
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Study AI isn't configured yet — add ANTHROPIC_API_KEY on the server." }, { status: 503 });
  }

  let body: GeneratePlanBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const subjectId = body.subjectId;
  if (!subjectId) return NextResponse.json({ error: "subjectId is required." }, { status: 400 });

  const subjectRes = await client.from("study_subjects").select("*").eq("id", subjectId).maybeSingle();
  const subject = subjectRes.data;
  if (!subject) return NextResponse.json({ error: "Subject not found." }, { status: 404 });

  const { data: allTopicsData } = await client
    .from("study_topics")
    .select("*")
    .eq("subject_id", subjectId)
    .order("mastery", { ascending: true });
  let topics = (allTopicsData ?? []) as StudyTopic[];

  // If a specific material was named, prefer its topics — but fall back to
  // the full subject topic list if that material doesn't map to any yet.
  if (body.materialId) {
    const scoped = topics.filter((t) => t.material_id === body.materialId);
    if (scoped.length > 0) topics = scoped;
  }

  if (topics.length === 0) {
    return NextResponse.json({ error: "This subject has no topics yet — upload material first so there's something to plan around." }, { status: 400 });
  }

  let daysAvailable = clamp(Math.round(body.daysAvailable ?? 5), 1, 60);
  const minutesPerDay = clamp(Math.round(body.minutesPerDay ?? 30), 10, 240);

  let examId: string | null = null;
  let examContext = "";
  if (body.examId) {
    const { data: exam } = await client.from("exams").select("*").eq("id", body.examId).maybeSingle();
    if (exam) {
      examId = exam.id;
      const diff = daysBetween(todayISO(), exam.exam_date);
      if (diff > 0) daysAvailable = clamp(diff, 1, 60);
      examContext = `The plan should finish preparing the student for their "${exam.title}" exam, which is on ${exam.exam_date} (${diff} day(s) from today).`;
    }
  }

  const topicSummary = topics
    .map((t) => `- ${t.name} (mastery: ${t.mastery}%)${t.summary ? `: ${t.summary}` : ""}`)
    .join("\n");

  const system = `You are an expert study planner for a student's subject called "${subject.name}". You build day-by-day study plans that prioritize the student's weakest topics first, without ever guaranteeing exam outcomes. Keep the tone encouraging but mature — no childish language.`;

  const userText = `Build a ${daysAvailable}-day study plan, roughly ${minutesPerDay} minutes of study per day (you may combine short topics on one day, or give one topic a full day — use judgment).
${examContext}

Topics to plan around, weakest first (weight the schedule toward these):
${topicSummary}

Rules:
- day_index starts at 1 and goes up to ${daysAvailable}.
- Weight earlier and more days toward low-mastery topics.
- If there are at least 4 days available, the plan MUST end with a "Practice Exam" day (topic_name: "Practice Exam") and then a final "Weak Topics Review" day (topic_name: "Weak Topics Review") reviewing the lowest-mastery topics — in that order, as the last two days.
- Otherwise use real topic names for topic_name so they can be matched back to the student's actual topics.
- duration_min should roughly match ${minutesPerDay} per day (per item if a day has multiple items, they should sum close to that).

Return JSON: {"days": [{"day_index": number, "topic_name": string, "duration_min": number}, ...]}`;

  let aiResult: { days: AIPlanDay[] };
  try {
    aiResult = await callStudyAIForJSON<{ days: AIPlanDay[] }>({
      system,
      userText,
      maxTokens: 2048,
      effort: "medium",
    });
  } catch {
    return NextResponse.json({ error: "Couldn't generate a study plan right now. Try again in a moment." }, { status: 502 });
  }

  const days = Array.isArray(aiResult.days) ? aiResult.days.filter((d) => d && d.topic_name && d.day_index >= 1) : [];
  if (days.length === 0) {
    return NextResponse.json({ error: "The AI didn't return a usable plan. Try again." }, { status: 502 });
  }

  // Safety net: if the model forgot the closing Practice Exam / Weak Topics
  // Review days despite the instruction, and there's room for them, append.
  if (daysAvailable >= 4) {
    const hasPractice = days.some((d) => /practice exam/i.test(d.topic_name));
    const hasReview = days.some((d) => /weak topics/i.test(d.topic_name));
    const maxDay = Math.max(...days.map((d) => d.day_index));
    if (!hasPractice) days.push({ day_index: Math.max(maxDay, daysAvailable - 1), topic_name: "Practice Exam", duration_min: minutesPerDay });
    if (!hasReview) days.push({ day_index: Math.max(maxDay, daysAvailable), topic_name: "Weak Topics Review", duration_min: minutesPerDay });
  }

  days.sort((a, b) => a.day_index - b.day_index);

  const { data: plan, error: planError } = await client
    .from("study_plans")
    .insert({ user_id: user.id, subject_id: subjectId, exam_id: examId, accepted: false })
    .select("*")
    .single();

  if (planError || !plan) {
    return NextResponse.json({ error: "Couldn't save the generated plan." }, { status: 500 });
  }

  const itemsToInsert = days.map((d) => {
    const matched = matchTopic(d.topic_name, topics);
    return {
      plan_id: plan.id,
      user_id: user.id,
      day_index: d.day_index,
      topic_id: matched?.id ?? null,
      label: matched?.name ?? d.topic_name,
      duration_min: clamp(Math.round(d.duration_min || minutesPerDay), 5, 240),
      completed: false,
    };
  });

  const { data: items, error: itemsError } = await client.from("study_plan_items").insert(itemsToInsert).select("*");

  if (itemsError) {
    // Clean up the orphaned plan so a failed generation doesn't leave debris.
    await client.from("study_plans").delete().eq("id", plan.id);
    return NextResponse.json({ error: "Couldn't save the plan's days." }, { status: 500 });
  }

  return NextResponse.json({ plan, items: (items ?? []).sort((a, b) => a.day_index - b.day_index) });
}
