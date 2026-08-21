import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { checkEntitlement } from "@/lib/billing/entitlement";
import { callStudyAIForJSON, StudyAIError } from "@/lib/study/ai";
import type { QuizDifficulty, QuizQuestion, QuizQuestionType, StudyQuiz, StudyTopic, MaterialAnalysisFull } from "@/lib/study/types";

export const runtime = "nodejs";

const VALID_DIFFICULTIES: QuizDifficulty[] = ["easy", "medium", "hard", "exam"];
const VALID_COUNTS = [5, 10, 20];
const VALID_TYPES: QuizQuestionType[] = ["multiple_choice", "true_false", "short_answer", "fill_blank", "scenario"];

interface GenerateQuizBody {
  subjectId?: string;
  topicId?: string;
  materialId?: string;
  questionCount?: number;
  difficulty?: QuizDifficulty;
  isMockExam?: boolean;
  timeLimitMin?: number;
}

interface AIQuizResponse {
  questions: {
    id?: string;
    type: string;
    topic: string;
    prompt: string;
    options?: string[];
    answer: string;
    explanation: string;
  }[];
}

const DIFFICULTY_GUIDANCE: Record<QuizDifficulty, string> = {
  easy: "Genuinely easy — straightforward recall and recognition of core facts/definitions. A student who skimmed the material once should be able to answer confidently.",
  medium: "Medium difficulty — requires understanding and light application, not just memorized recall. Mix a few straightforward questions with a few that need connecting ideas.",
  hard: "Hard — requires real application, multi-step reasoning, or synthesizing multiple concepts. Avoid trivial recall questions entirely.",
  exam: "Exam-level — read like real exam-register questions: formal phrasing, rigorous, testing genuine understanding and application under exam conditions. This is the hardest tier.",
};

export async function POST(req: NextRequest) {
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error }, { status: 401 });
  if (!(await checkEntitlement(client, user.id))) {
    return NextResponse.json({ error: "This feature requires Alxioum Plus." }, { status: 402 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Quiz generation isn't configured yet — add ANTHROPIC_API_KEY on the server." }, { status: 503 });
  }

  let body: GenerateQuizBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { subjectId, topicId, materialId } = body;
  if (!subjectId) return NextResponse.json({ error: "subjectId is required." }, { status: 400 });

  const questionCount = body.questionCount;
  if (!questionCount || !VALID_COUNTS.includes(questionCount)) {
    return NextResponse.json({ error: "questionCount must be 5, 10, or 20." }, { status: 400 });
  }

  const difficulty = body.difficulty;
  if (!difficulty || !VALID_DIFFICULTIES.includes(difficulty)) {
    return NextResponse.json({ error: "difficulty must be easy, medium, hard, or exam." }, { status: 400 });
  }

  const isMockExam = !!body.isMockExam;
  const timeLimitMin = typeof body.timeLimitMin === "number" && body.timeLimitMin > 0 ? Math.round(body.timeLimitMin) : null;

  const { data: subjectRow, error: subjectError } = await client.from("study_subjects").select("*").eq("id", subjectId).maybeSingle();
  if (subjectError || !subjectRow) return NextResponse.json({ error: "Subject not found." }, { status: 404 });

  try {
    // Gather source context + (for a single-topic quiz) adaptive mastery signal.
    let contextText = "";
    let adaptiveGuidance = "";
    let resolvedTopicId: string | null = null;

    if (topicId) {
      const { data: topic } = await client.from("study_topics").select("*").eq("id", topicId).maybeSingle();
      if (!topic) return NextResponse.json({ error: "Topic not found." }, { status: 404 });
      const t = topic as StudyTopic;
      resolvedTopicId = t.id;

      contextText =
        `The quiz should focus entirely on this single topic:\n` +
        `- Topic: ${t.name}\n` +
        `${t.summary ? `- Summary: ${t.summary}\n` : ""}` +
        `${t.key_concepts.length ? `- Key concepts: ${t.key_concepts.join(", ")}\n` : ""}`;

      const accuracy = t.quiz_attempts > 0 ? Math.round((t.correct_answers / t.quiz_attempts) * 100) : null;
      if (t.quiz_attempts > 0) {
        const stance =
          t.mastery < 50
            ? "This student is still shaky here — start with easier, confidence-building questions and build up gradually toward the requested difficulty, reinforcing fundamentals along the way."
            : t.mastery < 80
            ? "This student has a decent handle on this topic — mix in a couple of comfortable questions but lean toward stretching them with harder ones."
            : "This student already knows this topic well — go straight to harder, more nuanced questions and avoid repeating what they've clearly already mastered.";
        adaptiveGuidance =
          `\nADAPTIVE DIFFICULTY SIGNAL: this student is at ${t.mastery}% mastery on "${t.name}" after ${t.quiz_attempts} previous quiz attempt(s)` +
          `${accuracy !== null ? ` (${accuracy}% correct historically)` : ""}. ${stance}`;
      }
    } else if (materialId) {
      const { data: materialRow } = await client.from("study_materials").select("*").eq("id", materialId).maybeSingle();
      if (!materialRow) return NextResponse.json({ error: "Material not found." }, { status: 404 });

      const { data: materialTopics } = await client.from("study_topics").select("*").eq("material_id", materialId);
      const topics = (materialTopics ?? []) as StudyTopic[];

      // The `analysis` jsonb column may store a richer shape than the
      // minimal MaterialAnalysisSummary type declares — read it
      // defensively for the extra terms/potential_questions fields.
      const analysis = materialRow.analysis as Partial<MaterialAnalysisFull> | null;

      const topicLines = topics.length
        ? topics
            .map((t) => `- ${t.name}${t.summary ? `: ${t.summary}` : ""}${t.key_concepts.length ? ` (key concepts: ${t.key_concepts.join(", ")})` : ""}`)
            .join("\n")
        : "";
      const termsLine = analysis?.terms?.length ? `Key terms from this material: ${analysis.terms.join(", ")}.` : "";
      const questionsLine = analysis?.potential_questions?.length
        ? `Sample questions this material could support: ${analysis.potential_questions.join(" | ")}.`
        : "";

      contextText =
        `The quiz should draw only on this specific material: "${materialRow.title}".\n` +
        `${topicLines ? `Topics extracted from it:\n${topicLines}\n` : ""}` +
        `${termsLine}\n${questionsLine}\n`;
    } else {
      const { data: subjectTopics } = await client.from("study_topics").select("*").eq("subject_id", subjectId);
      const topics = (subjectTopics ?? []) as StudyTopic[];
      if (topics.length === 0) {
        return NextResponse.json(
          { error: "This subject has no topics yet — add some material first so there's something to quiz on." },
          { status: 400 }
        );
      }
      contextText =
        `The quiz should draw from across this subject's full topic list:\n` +
        topics.map((t) => `- ${t.name}${t.summary ? `: ${t.summary}` : ""}${t.key_concepts.length ? ` (key concepts: ${t.key_concepts.join(", ")})` : ""}`).join("\n");
    }

    const systemPrompt =
      `You are an expert study coach writing a quiz for a student studying "${subjectRow.name}". ` +
      `Write exactly ${questionCount} original questions grounded only in the study content provided — never invent facts that aren't implied by it. ` +
      `Difficulty target: ${DIFFICULTY_GUIDANCE[difficulty]} ` +
      `Mix question types across multiple_choice, true_false, short_answer, fill_blank, and scenario — use a genuine variety, not just one type, unless the source content is so thin it only supports one or two types. ` +
      `${isMockExam ? "This is a full mock exam — questions should read like a real exam paper, formally worded, covering breadth across the material." : ""}`;

    const userText =
      `${contextText}${adaptiveGuidance}\n\n` +
      `Respond with ONLY JSON matching:\n` +
      `{ "questions": [ { "id": "q1", "type": "multiple_choice" | "true_false" | "short_answer" | "fill_blank" | "scenario", "topic": string, "prompt": string, "options": string[] (4 options, ONLY for multiple_choice; ["True","False"] ONLY for true_false; omit entirely for other types), "answer": string (the correct option text for multiple_choice/true_false, or the ideal/expected answer for free-text types), "explanation": string (1-2 sentences on why the answer is correct) } ] }\n` +
      `Give each question a short stable id "q1", "q2", ... "q${questionCount}" in order. "topic" should be a short label naming which topic the question covers (match the topic names given above where possible).`;

    const ai = await callStudyAIForJSON<AIQuizResponse>({
      system: systemPrompt,
      userText,
      maxTokens: 4096,
      effort: difficulty === "exam" || isMockExam ? "high" : "medium",
    });

    const rawQuestions = Array.isArray(ai.questions) ? ai.questions : [];
    if (rawQuestions.length === 0) throw new StudyAIError("The AI didn't return any questions. Try again.");

    const questions: QuizQuestion[] = rawQuestions.map((q, i) => {
      const type: QuizQuestionType = VALID_TYPES.includes(q.type as QuizQuestionType) ? (q.type as QuizQuestionType) : "short_answer";
      const needsOptions = type === "multiple_choice" || type === "true_false";
      return {
        id: q.id && typeof q.id === "string" ? q.id : `q${i + 1}`,
        type,
        topic: q.topic || subjectRow.name,
        prompt: q.prompt ?? "",
        options: needsOptions && Array.isArray(q.options) ? q.options : undefined,
        answer: q.answer ?? "",
        explanation: q.explanation ?? "",
      };
    });

    const { data: quizRow, error: insertError } = await client
      .from("study_quizzes")
      .insert({
        user_id: user.id,
        subject_id: subjectId,
        topic_id: resolvedTopicId,
        material_id: materialId ?? null,
        difficulty,
        question_count: questions.length,
        questions,
        is_mock_exam: isMockExam,
        time_limit_min: timeLimitMin,
      })
      .select()
      .single();

    if (insertError || !quizRow) throw new StudyAIError("Couldn't save the generated quiz.");

    return NextResponse.json({ quiz: quizRow as StudyQuiz });
  } catch (err) {
    const message = err instanceof StudyAIError ? err.message : "Quiz generation failed. Try again in a moment.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
