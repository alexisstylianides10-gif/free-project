import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { checkEntitlement } from "@/lib/billing/entitlement";
import { callStudyAIForJSON } from "@/lib/study/ai";
import { logFocusSession, updateTopicMastery } from "@/lib/study/actions";
import { awardAchievementOnce } from "@/lib/actions/achievements";
import type { AnswerVerdict, QuizQuestion, QuizResultItem, StudyQuiz, StudyTopic } from "@/lib/study/types";
import type { Profile as AppProfile } from "@/lib/types";

export const runtime = "nodejs";

interface GradeQuizBody {
  quizId?: string;
  answers?: { question_id: string; your_answer: string }[];
}

interface AIFreeTextGrade {
  question_id: string;
  verdict: AnswerVerdict;
  explanation: string;
}

interface AIGradeResponse {
  results: AIFreeTextGrade[];
}

interface AIFocusNoteResponse {
  next_focus_note: string;
}

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Locally grades an objectively-checkable question (multiple_choice /
 * true_false) — exact/near string match, no AI call needed. */
function gradeObjective(question: QuizQuestion, yourAnswer: string): QuizResultItem {
  const normalizedYour = normalize(yourAnswer);
  const normalizedCorrect = normalize(question.answer);
  let isCorrect = normalizedYour.length > 0 && normalizedYour === normalizedCorrect;

  if (!isCorrect && question.type === "true_false") {
    const yourBool = normalizedYour.startsWith("t") ? "true" : normalizedYour.startsWith("f") ? "false" : null;
    const correctBool = normalizedCorrect.startsWith("t") ? "true" : normalizedCorrect.startsWith("f") ? "false" : null;
    isCorrect = !!yourBool && !!correctBool && yourBool === correctBool;
  }

  return {
    question_id: question.id,
    your_answer: yourAnswer,
    verdict: isCorrect ? "correct" : "review",
    correct_answer: question.answer,
    explanation: question.explanation,
    topic: question.topic,
  };
}

export async function POST(req: NextRequest) {
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error }, { status: 401 });
  if (!(await checkEntitlement(client, user.id))) {
    return NextResponse.json({ error: "This feature requires Alxioum Plus." }, { status: 402 });
  }

  let body: GradeQuizBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { quizId, answers } = body;
  if (!quizId || !Array.isArray(answers)) {
    return NextResponse.json({ error: "quizId and answers are required." }, { status: 400 });
  }

  const { data: quizRow, error: quizError } = await client.from("study_quizzes").select("*").eq("id", quizId).maybeSingle();
  if (quizError || !quizRow) return NextResponse.json({ error: "Quiz not found." }, { status: 404 });
  const quiz = quizRow as StudyQuiz;

  const answerMap = new Map(answers.map((a) => [a.question_id, a.your_answer ?? ""]));

  const objectiveResults: QuizResultItem[] = [];
  const freeTextQuestions: { question: QuizQuestion; yourAnswer: string }[] = [];

  for (const q of quiz.questions) {
    const yourAnswer = answerMap.get(q.id) ?? "";
    if (q.type === "multiple_choice" || q.type === "true_false") {
      objectiveResults.push(gradeObjective(q, yourAnswer));
    } else {
      freeTextQuestions.push({ question: q, yourAnswer });
    }
  }

  let freeTextResults: QuizResultItem[] = [];
  if (freeTextQuestions.length > 0) {
    if (!process.env.ANTHROPIC_API_KEY) {
      // No AI available — fall back to a conservative local check so the
      // quiz can still be scored (near-match on the model answer).
      freeTextResults = freeTextQuestions.map(({ question, yourAnswer }) => gradeObjective(question, yourAnswer));
    } else {
      try {
        const batchPrompt =
          `Grade each of this student's free-text answers against the expected answer, generously judging by meaning rather than exact wording. ` +
          `Use "correct" when the answer captures the key idea, "almost" when it's partially right or missing something important, and "review" when it's wrong or missing.\n\n` +
          freeTextQuestions
            .map(
              ({ question, yourAnswer }, i) =>
                `${i + 1}. Question (id: ${question.id}): ${question.prompt}\nExpected answer: ${question.answer}\nStudent's answer: ${yourAnswer || "(no answer given)"}`
            )
            .join("\n\n") +
          `\n\nRespond with ONLY JSON: { "results": [ { "question_id": string, "verdict": "correct" | "almost" | "review", "explanation": string (1-2 sentences, addressed to the student) } ] }`;

        const ai = await callStudyAIForJSON<AIGradeResponse>({
          system: "You are a fair, encouraging study coach grading a student's quiz answers.",
          userText: batchPrompt,
          maxTokens: 2048,
          effort: "medium",
        });

        const verdictMap = new Map((ai.results ?? []).map((r) => [r.question_id, r]));
        freeTextResults = freeTextQuestions.map(({ question, yourAnswer }) => {
          const graded = verdictMap.get(question.id);
          return {
            question_id: question.id,
            your_answer: yourAnswer,
            verdict: graded?.verdict ?? "review",
            correct_answer: question.answer,
            explanation: graded?.explanation ?? question.explanation,
            topic: question.topic,
          };
        });
      } catch {
        // AI grading failed — don't lose the whole submission, fall back to
        // a conservative local check for these questions.
        freeTextResults = freeTextQuestions.map(({ question, yourAnswer }) => gradeObjective(question, yourAnswer));
      }
    }
  }

  // Reassemble results in original question order.
  const resultsById = new Map([...objectiveResults, ...freeTextResults].map((r) => [r.question_id, r]));
  const results: QuizResultItem[] = quiz.questions.map((q) => resultsById.get(q.id)).filter((r): r is QuizResultItem => !!r);

  const correctCount = results.filter((r) => r.verdict === "correct").length;
  const scorePercent = results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0;

  // Group by topic label to find strong (all-correct) vs weak (any miss) topics.
  const byTopic = new Map<string, QuizResultItem[]>();
  for (const r of results) {
    const list = byTopic.get(r.topic) ?? [];
    list.push(r);
    byTopic.set(r.topic, list);
  }
  const strongTopics: string[] = [];
  const weakTopics: string[] = [];
  for (const [topic, items] of byTopic) {
    if (items.every((r) => r.verdict === "correct")) strongTopics.push(topic);
    else weakTopics.push(topic);
  }

  const { data: insertedAttempt, error: insertError } = await client
    .from("study_quiz_attempts")
    .insert({
      quiz_id: quiz.id,
      user_id: user.id,
      score_percent: scorePercent,
      correct_count: correctCount,
      results,
      strong_topics: strongTopics,
      weak_topics: weakTopics,
    })
    .select()
    .single();

  if (insertError || !insertedAttempt) {
    return NextResponse.json({ error: "Couldn't save your quiz results." }, { status: 500 });
  }

  // Update mastery for every question that resolves to a real study_topics row.
  if (quiz.topic_id) {
    // Single-topic quiz — every question maps to the same stored topic.
    for (const r of results) {
      await updateTopicMastery(client, quiz.topic_id, r.verdict === "correct");
    }
  } else {
    const { data: subjectTopics } = await client.from("study_topics").select("id, name").eq("subject_id", quiz.subject_id);
    const topics = (subjectTopics ?? []) as Pick<StudyTopic, "id" | "name">[];
    for (const r of results) {
      const match = topics.find((t) => normalize(t.name) === normalize(r.topic));
      if (match) await updateTopicMastery(client, match.id, r.verdict === "correct");
    }
  }

  // Log the study activity (XP + streak) exactly like every other study surface.
  const { data: profileRow } = await client.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (profileRow) {
    const durationMin = Math.max(3, Math.round(quiz.question_count * 1.5));
    await logFocusSession(
      client,
      user.id,
      { subjectId: quiz.subject_id, topicId: quiz.topic_id ?? null, mode: "quiz", durationMin, accuracyPercent: scorePercent },
      profileRow as AppProfile
    );
  }

  // First-quiz / first-mock-exam achievements.
  const { count: totalAttempts } = await client
    .from("study_quiz_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if ((totalAttempts ?? 0) === 1) await awardAchievementOnce(client, user.id, "first_quiz");

  if (quiz.is_mock_exam) {
    const { data: mockExamQuizzes } = await client.from("study_quizzes").select("id").eq("user_id", user.id).eq("is_mock_exam", true);
    const mockExamQuizIds = (mockExamQuizzes ?? []).map((q: { id: string }) => q.id);
    if (mockExamQuizIds.length > 0) {
      const { count: mockAttemptCount } = await client
        .from("study_quiz_attempts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .in("quiz_id", mockExamQuizIds);
      if ((mockAttemptCount ?? 0) === 1) await awardAchievementOnce(client, user.id, "first_mock_exam");
    }
  }

  // Mock exams get one extra AI-authored practice-based signal line — never
  // a promise about the real exam outcome.
  let nextFocusNote: string | undefined;
  if (quiz.is_mock_exam && process.env.ANTHROPIC_API_KEY) {
    try {
      const noteResponse = await callStudyAIForJSON<AIFocusNoteResponse>({
        system:
          "You are a study coach summarizing one mock exam result in a single encouraging, practice-focused sentence. Never claim the student will pass or fail their real exam — only speak to what their practice results suggest about what to study next.",
        userText:
          `Mock exam result: ${scorePercent}% (${correctCount}/${results.length} correct).\n` +
          `Strong topics: ${strongTopics.join(", ") || "none yet"}.\n` +
          `Topics needing work: ${weakTopics.join(", ") || "none — strong across the board"}.\n\n` +
          `Respond with ONLY JSON: { "next_focus_note": string } — one sentence, in the style of: "Based on your recent practice results, genetics should be your next focus." Reference the weakest topic if there is one; if there isn't, give an encouraging one-liner instead.`,
        maxTokens: 300,
        effort: "low",
      });
      nextFocusNote = noteResponse.next_focus_note;
    } catch {
      // Non-critical — the results page just won't show the extra line.
    }
  }

  return NextResponse.json({
    attempt: insertedAttempt,
    ...(nextFocusNote ? { next_focus_note: nextFocusNote } : {}),
  });
}
