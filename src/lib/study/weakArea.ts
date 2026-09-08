import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { callStudyAIForJSON, StudyAIError } from "@/lib/study/ai";
import type { Locale } from "@/lib/i18n/locales";
import type { WeakAreaPlan, WeakAreaPlanContent } from "@/lib/study/types";

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
    `would actually help this specific student, not what looks complete.`;

  const userText =
    `Subject: ${subjectName}\n` +
    `Student's own description of their problem: "${description}"\n\n` +
    `Respond with ONLY JSON matching:\n` +
    `{\n` +
    `  "summary": string (1-2 sentences reflecting back what the real problem is),\n` +
    `  "roadmap": [{ "title": string, "detail": string }] (3-6 concrete steps, in order — omit entirely if a roadmap wouldn't help here),\n` +
    `  "exercises": [{ "title": string, "passage": string (only for passage-based exercises like reading comprehension — omit for others), "questions": [{ "question": string, "answer": string }] }] (2-4 exercises with real content, not placeholders — omit entirely if practice exercises wouldn't help here),\n` +
    `  "resources": [{ "title": string, "author": string (omit if not a book), "why": string (1 sentence on why this specific resource helps this specific problem) }] (2-4 real, genuinely relevant resources — omit entirely if you don't have a genuinely good recommendation)\n` +
    `}\n` +
    `At least one of roadmap/exercises/resources must be present. Every exercise question must have a real, correct answer, not a placeholder.`;

  let plan: WeakAreaPlanContent;
  try {
    plan = await callStudyAIForJSON<WeakAreaPlanContent>({
      system,
      userText,
      maxTokens: 3072,
      effort: "medium",
      language,
    });
  } catch (err) {
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
