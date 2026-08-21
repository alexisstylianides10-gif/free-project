import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { checkEntitlement } from "@/lib/billing/entitlement";
import { callStudyAIForJSON, StudyAIError } from "@/lib/study/ai";
import type { StudyFlashcard, StudyTopic, MaterialAnalysisFull } from "@/lib/study/types";

export const runtime = "nodejs";

const DEFAULT_COUNT = 10;
const MAX_COUNT = 20;

interface GenerateFlashcardsBody {
  subjectId?: string;
  topicId?: string;
  materialId?: string;
  count?: number;
}

interface AIFlashcardsResponse {
  cards: { front: string; back: string; topic_name: string }[];
}

export async function POST(req: NextRequest) {
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error }, { status: 401 });
  if (!(await checkEntitlement(client, user.id))) {
    return NextResponse.json({ error: "This feature requires Alxioum Plus." }, { status: 402 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Flashcard generation isn't configured yet — add ANTHROPIC_API_KEY on the server." }, { status: 503 });
  }

  let body: GenerateFlashcardsBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { subjectId, topicId, materialId } = body;
  if (!subjectId) return NextResponse.json({ error: "subjectId is required." }, { status: 400 });

  const count = Math.min(MAX_COUNT, Math.max(1, Math.round(body.count ?? DEFAULT_COUNT)));

  const { data: subjectRow, error: subjectError } = await client.from("study_subjects").select("*").eq("id", subjectId).maybeSingle();
  if (subjectError || !subjectRow) return NextResponse.json({ error: "Subject not found." }, { status: 404 });

  // Every topic in the subject, so a generated card's `topic_name` can be
  // matched back to a real study_topics row regardless of which context
  // (topic / material / whole subject) it came from.
  const { data: subjectTopicsRaw } = await client.from("study_topics").select("*").eq("subject_id", subjectId);
  const subjectTopics = (subjectTopicsRaw ?? []) as StudyTopic[];

  let contextText: string;

  if (topicId) {
    const topic = subjectTopics.find((t) => t.id === topicId);
    if (!topic) return NextResponse.json({ error: "Topic not found." }, { status: 404 });
    contextText =
      `The flashcards should focus entirely on this single topic:\n` +
      `- Topic: ${topic.name}\n` +
      `${topic.summary ? `- Summary: ${topic.summary}\n` : ""}` +
      `${topic.key_concepts.length ? `- Key concepts: ${topic.key_concepts.join(", ")}\n` : ""}`;
  } else if (materialId) {
    const { data: materialRow } = await client.from("study_materials").select("*").eq("id", materialId).maybeSingle();
    if (!materialRow) return NextResponse.json({ error: "Material not found." }, { status: 404 });

    const materialTopics = subjectTopics.filter((t) => t.material_id === materialId);
    // The `analysis` jsonb column may store a richer shape than the minimal
    // MaterialAnalysisSummary type declares — read it defensively for the
    // extra terms/potential_questions fields the Materials agent stored.
    const analysis = materialRow.analysis as Partial<MaterialAnalysisFull> | null;
    const terms = analysis?.terms ?? [];
    const potentialQuestions = analysis?.potential_questions ?? [];

    const topicLines = materialTopics.length
      ? materialTopics.map((t) => `- ${t.name}${t.summary ? `: ${t.summary}` : ""}${t.key_concepts.length ? ` (key concepts: ${t.key_concepts.join(", ")})` : ""}`).join("\n")
      : "";

    contextText =
      `The flashcards should draw only on this specific material: "${materialRow.title}".\n` +
      `${topicLines ? `Topics extracted from it:\n${topicLines}\n` : ""}` +
      `${terms.length ? `Key terms from this material: ${terms.join(", ")}.\n` : ""}` +
      `${potentialQuestions.length ? `Sample questions this material could support: ${potentialQuestions.join(" | ")}.\n` : ""}` +
      `${!topicLines && !terms.length && !potentialQuestions.length && materialRow.raw_text ? `Raw text:\n${String(materialRow.raw_text).slice(0, 6000)}\n` : ""}`;
  } else {
    if (subjectTopics.length === 0) {
      return NextResponse.json(
        { error: "This subject has no topics yet — add some material first so there's something to make flashcards from." },
        { status: 400 }
      );
    }
    contextText =
      `The flashcards should draw from across this subject's full topic list:\n` +
      subjectTopics.map((t) => `- ${t.name}${t.summary ? `: ${t.summary}` : ""}${t.key_concepts.length ? ` (key concepts: ${t.key_concepts.join(", ")})` : ""}`).join("\n");
  }

  try {
    const systemPrompt =
      `You are an expert study coach writing spaced-repetition flashcards for a student studying "${subjectRow.name}". ` +
      `Write exactly ${count} original flashcards grounded only in the study content provided — never invent facts that aren't implied by it. ` +
      `Each "front" is a genuine recall question or short prompt (e.g. "What is the powerhouse of the cell?"). ` +
      `Each "back" is a short, direct answer — a word, phrase, or one short sentence (e.g. "Mitochondria."), never a paragraph. ` +
      `Spread the cards across the topics given rather than clustering on just one, unless only one topic was provided.`;

    const userText =
      `${contextText}\n\n` +
      `Respond with ONLY JSON matching:\n` +
      `{ "cards": [ { "front": string, "back": string, "topic_name": string } ] }\n` +
      `"topic_name" should match one of the topic names given above as closely as possible.`;

    const ai = await callStudyAIForJSON<AIFlashcardsResponse>({
      system: systemPrompt,
      userText,
      maxTokens: 4096,
      effort: "medium",
    });

    const rawCards = Array.isArray(ai.cards) ? ai.cards : [];
    const cleanCards = rawCards.filter((c) => c && typeof c.front === "string" && c.front.trim() && typeof c.back === "string" && c.back.trim());
    if (cleanCards.length === 0) throw new StudyAIError("The AI didn't return any flashcards. Try again.");

    const topicByName = new Map(subjectTopics.map((t) => [t.name.trim().toLowerCase(), t.id]));

    const rows = cleanCards.slice(0, count).map((c) => ({
      user_id: user.id,
      subject_id: subjectId,
      topic_id: topicByName.get((c.topic_name ?? "").trim().toLowerCase()) ?? topicId ?? null,
      front: c.front.trim(),
      back: c.back.trim(),
    }));

    const { data: inserted, error: insertError } = await client.from("study_flashcards").insert(rows).select();
    if (insertError || !inserted) throw new StudyAIError("Couldn't save the generated flashcards.");

    return NextResponse.json({ cards: inserted as StudyFlashcard[] });
  } catch (err) {
    const message = err instanceof StudyAIError ? err.message : "Flashcard generation failed. Try again in a moment.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
