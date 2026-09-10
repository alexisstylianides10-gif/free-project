import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { callStudyAIForJSON, StudyAIError } from "@/lib/study/ai";
import type { Locale } from "@/lib/i18n/locales";
import type { WeakAreaPlan, WeakAreaPlanContent, WeakAreaExercise, WeakAreaRoadmapStep, WeakAreaResource } from "@/lib/study/types";

/**
 * Coerces the AI's raw JSON into a shape the renderer can trust — same
 * defensive pattern generate-quiz/generate-flashcards already use for their
 * AI responses. Without this, any shape drift from the model (a missing
 * `questions` array, roadmap returned as an object instead of an array,
 * etc.) would still parse as valid JSON and get saved with status "ready",
 * permanently bricking that plan's page on every future render.
 */
function sanitizePlanContent(raw: WeakAreaPlanContent): WeakAreaPlanContent {
  const roadmap = Array.isArray(raw.roadmap)
    ? raw.roadmap
        .filter((s): s is WeakAreaRoadmapStep => !!s && typeof s.title === "string" && typeof s.detail === "string")
        .map((s) => ({ title: s.title, detail: s.detail }))
    : undefined;

  const exercises = Array.isArray(raw.exercises)
    ? raw.exercises
        .filter((e): e is WeakAreaExercise => !!e && typeof e.title === "string" && Array.isArray(e.questions))
        .map((e) => ({
          title: e.title,
          passage: typeof e.passage === "string" ? e.passage : undefined,
          questions: e.questions.filter((q) => q && typeof q.question === "string" && typeof q.answer === "string"),
        }))
        .filter((e) => e.questions.length > 0)
    : undefined;

  const resources = Array.isArray(raw.resources)
    ? raw.resources
        .filter((r): r is WeakAreaResource => !!r && typeof r.title === "string" && typeof r.why === "string")
        .map((r) => ({ title: r.title, author: typeof r.author === "string" ? r.author : undefined, why: r.why }))
    : undefined;

  return {
    summary: typeof raw.summary === "string" ? raw.summary : "",
    roadmap: roadmap && roadmap.length > 0 ? roadmap : undefined,
    exercises: exercises && exercises.length > 0 ? exercises : undefined,
    resources: resources && resources.length > 0 ? resources : undefined,
  };
}

/**
 * Shared by both the dedicated /api/study/weak-area-plan route (Subject
 * page entry point) and the AI Coach's create_weak_area_plan tool, so a
 * student gets the identical generation quality and the identical stored
 * row regardless of where they described the problem.
 */
export async function generateWeakAreaPlan(params: {
  client: SupabaseClient;
  userId: string;
  subjectId: string;
  subjectName: string;
  description: string;
  language?: Locale;
}): Promise<WeakAreaPlan> {
  const { client, userId, subjectId, subjectName, description, language } = params;

  const system =
    `You are an expert tutor building a personalized improvement plan for a student who described a specific difficulty ` +
    `with "${subjectName}". Read their description carefully and produce ONLY the pieces that genuinely help with THIS ` +
    `specific problem — never pad the response with irrelevant sections just to fill out a template. ` +
    `A reading/writing weakness usually benefits most from passage-based exercises; a conceptual weakness (e.g. "I don't ` +
    `understand fractions") usually benefits most from a step-by-step roadmap and practice problems; ask yourself what ` +
    `would actually help this specific student, not what looks complete. ` +
    `If the description names several distinct skills at once (e.g. "grammar, vocabulary, reading, AND writing" or just ` +
    `"everything"/"all of it"), do NOT try to cover all of them — pick the ONE that would move the needle most and build a ` +
    `focused, genuinely useful plan for just that, saying in the summary which one you picked and why. A focused plan on ` +
    `one real skill beats a shallow plan spread across five.`;

  const userText =
    `Subject: ${subjectName}\n` +
    `Student's own description of their problem: "${description}"\n\n` +
    `Respond with ONLY JSON matching:\n` +
    `{\n` +
    `  "summary": string (1-2 sentences reflecting back what the real problem is),\n` +
    `  "roadmap": [{ "title": string, "detail": string }] (3-4 concrete steps, in order — omit entirely if a roadmap wouldn't help here),\n` +
    `  "exercises": [{ "title": string, "passage": string (only for passage-based exercises like reading comprehension — keep it under 120 words; omit entirely for other exercise types), "questions": [{ "question": string, "answer": string }] }] (1-2 exercises with real content, not placeholders — 2-3 questions each, omit entirely if practice exercises wouldn't help here),\n` +
    `  "resources": [{ "title": string, "author": string (omit if not a book), "why": string (1 sentence on why this specific resource helps this specific problem) }] (2-3 real, genuinely relevant resources — omit entirely if you don't have a genuinely good recommendation)\n` +
    `}\n` +
    `At least one of roadmap/exercises/resources must be present. Every exercise question must have a real, correct answer, not a placeholder. Be concise everywhere — short, useful, no filler.`;

  let plan: WeakAreaPlanContent;
  try {
    const raw = await callStudyAIForJSON<WeakAreaPlanContent>({
      system,
      userText,
      maxTokens: 2048,
      effort: "medium",
      language,
    });
    plan = sanitizePlanContent(raw);
    if (!plan.roadmap && !plan.exercises && !plan.resources) {
      throw new StudyAIError("The AI didn't return anything usable. Try again.");
    }
  } catch (err) {
    // Previously swallowed entirely — every past failure left no trace of
    // *why* beyond a generic message, which is how a 100%-failing feature
    // went undiagnosed. Always log the real cause before falling back.
    console.error("generateWeakAreaPlan failed:", err);
    await client.from("weak_area_plans").insert({
      user_id: userId,
      subject_id: subjectId,
      description,
      status: "failed",
    });
    throw err instanceof StudyAIError ? err : new StudyAIError("Couldn't build a plan for that. Try again.");
  }

  const { data: row, error: insertError } = await client
    .from("weak_area_plans")
    .insert({ user_id: userId, subject_id: subjectId, description, status: "ready", plan })
    .select()
    .single();
  if (insertError || !row) throw new StudyAIError("Couldn't save the generated plan.");

  return row as WeakAreaPlan;
}
