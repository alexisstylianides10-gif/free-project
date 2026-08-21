import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { callStudyAIForJSON, StudyAIError } from "@/lib/study/ai";
import type { StudyMaterial, StudyTopic, MaterialAnalysisFull } from "@/lib/study/types";

export const runtime = "nodejs";

const SYSTEM_PROMPT =
  "You are an expert study coach analyzing a student's material. Extract what's actually in it — do not invent content that isn't there. If the material is short or thin, extract fewer topics/terms/questions rather than padding the output.";

interface AnalysisResponse {
  topics: { name: string; summary: string; key_concepts: string[] }[];
  terms: string[];
  potential_questions: string[];
}

export async function POST(req: NextRequest) {
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Material analysis isn't configured yet — add ANTHROPIC_API_KEY on the server." }, { status: 503 });
  }

  let body: { materialId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const materialId = body.materialId;
  if (!materialId) return NextResponse.json({ error: "materialId is required." }, { status: 400 });

  const { data: materialRow, error: fetchError } = await client
    .from("study_materials")
    .select("*")
    .eq("id", materialId)
    .maybeSingle();

  if (fetchError || !materialRow) {
    return NextResponse.json({ error: "Material not found." }, { status: 404 });
  }
  const material = materialRow as StudyMaterial;

  await client.from("study_materials").update({ status: "analyzing" }).eq("id", materialId);

  try {
    let document: { mediaType: string; base64: string } | undefined;
    let userText: string;

    if (material.kind === "pdf" || material.kind === "image") {
      if (!material.storage_path) throw new StudyAIError("This material has no file attached.");
      const { data: blob, error: downloadError } = await client.storage.from("study-materials").download(material.storage_path);
      if (downloadError || !blob) throw new StudyAIError("Couldn't download the uploaded file.");

      const base64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
      const mediaType = material.kind === "pdf" ? "application/pdf" : blob.type || "image/jpeg";
      document = { mediaType, base64 };
      userText =
        `Analyze the attached ${material.kind === "pdf" ? "PDF" : "photo/image"} titled "${material.title}" and extract its study content as JSON matching:\n` +
        `{ "topics": [{ "name": string, "summary": string, "key_concepts": string[] }], "terms": string[], "potential_questions": string[] }\n` +
        `Pick a reasonable number of topics, terms, and questions based on how much material is actually here — don't force a fixed count.`;
    } else {
      const rawText = (material.raw_text ?? "").trim();
      if (!rawText) throw new StudyAIError("This material has no text to analyze.");
      userText =
        `Analyze the following study material titled "${material.title}" and extract its study content as JSON matching:\n` +
        `{ "topics": [{ "name": string, "summary": string, "key_concepts": string[] }], "terms": string[], "potential_questions": string[] }\n` +
        `Pick a reasonable number of topics, terms, and questions based on how much material is actually here — don't force a fixed count.\n\n` +
        `--- MATERIAL START ---\n${rawText}\n--- MATERIAL END ---`;
    }

    const analysis = await callStudyAIForJSON<AnalysisResponse>({
      system: SYSTEM_PROMPT,
      userText,
      document,
      maxTokens: 4096,
      effort: "medium",
    });

    const topics = Array.isArray(analysis.topics) ? analysis.topics : [];
    const terms = Array.isArray(analysis.terms) ? analysis.terms : [];
    const potentialQuestions = Array.isArray(analysis.potential_questions) ? analysis.potential_questions : [];

    let createdTopics: StudyTopic[] = [];
    if (topics.length > 0) {
      const rows = topics.map((t) => ({
        user_id: user.id,
        subject_id: material.subject_id,
        material_id: material.id,
        name: t.name,
        summary: t.summary ?? null,
        key_concepts: Array.isArray(t.key_concepts) ? t.key_concepts : [],
        mastery: 30,
      }));
      const { data: inserted, error: insertError } = await client.from("study_topics").insert(rows).select();
      if (insertError) throw new StudyAIError("Couldn't save the extracted topics.");
      createdTopics = (inserted ?? []) as StudyTopic[];
    }

    const conceptCount = topics.reduce((sum, t) => sum + (Array.isArray(t.key_concepts) ? t.key_concepts.length : 0), 0);
    const fullAnalysis: MaterialAnalysisFull = {
      topic_count: topics.length,
      concept_count: conceptCount,
      term_count: terms.length,
      question_count: potentialQuestions.length,
      terms,
      potential_questions: potentialQuestions,
    };

    const { error: updateError } = await client
      .from("study_materials")
      .update({ status: "analyzed", analysis: fullAnalysis })
      .eq("id", materialId);
    if (updateError) throw new StudyAIError("Couldn't save the analysis.");

    return NextResponse.json({ topics: createdTopics, analysis: fullAnalysis });
  } catch (err) {
    await client.from("study_materials").update({ status: "failed" }).eq("id", materialId);
    const message = err instanceof StudyAIError ? err.message : "Analysis failed. Try again in a moment.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
