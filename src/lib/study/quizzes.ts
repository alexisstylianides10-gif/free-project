import Anthropic from "@anthropic-ai/sdk";
import type { QuizQuestion } from "@/lib/types";

let cachedClient: Anthropic | null = null;
function anthropic(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");
  if (!cachedClient) cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

const QUIZ_TOOL: Anthropic.Messages.Tool = {
  name: "record_quiz",
  description: "Record a multiple-choice quiz generated strictly from the supplied study material.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "A short quiz title summarizing the material." },
      questions: {
        type: "array",
        minItems: 5,
        maxItems: 15,
        description: "Questions testing the material actually present — never invent a fact or answer not grounded in it.",
        items: {
          type: "object",
          properties: {
            question: { type: "string" },
            options: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5, description: "Answer choices, including the correct one." },
            correctAnswer: { type: "string", description: "Must exactly match one of the options." },
            explanation: { type: "string", description: "One sentence explaining why that's the answer." },
            topic: { type: "string", description: "A short sub-topic label within the material, e.g. 'Light-dependent reactions' — used for weak-topic tracking. Reuse the same label across related questions." },
          },
          required: ["question", "options", "correctAnswer", "explanation"],
        },
      },
    },
    required: ["title", "questions"],
  },
};

export type GenerateQuizOutcome = { ok: true; title: string; questions: QuizQuestion[] } | { ok: false; error: string };

/** Grounded only in the supplied material — same honesty rules as generateFlashcards. */
export async function generateQuiz(material: string): Promise<GenerateQuizOutcome> {
  const trimmed = material.trim();
  if (!trimmed) return { ok: false, error: "No material to generate a quiz from." };

  try {
    const response = await anthropic().messages.create({
      model: process.env.ALXIOUM_MODEL || "claude-sonnet-4-5-20250929",
      max_tokens: 2000,
      system:
        "You are creating a practice quiz for a student to test themselves on. Only test facts, definitions, and relationships actually present in the supplied material — never invent a question or answer not grounded in it. Group related questions under consistent topic labels so weak areas can be identified. If the material is too thin for 5 good questions, make fewer rather than inventing content.",
      tools: [QUIZ_TOOL],
      tool_choice: { type: "tool", name: "record_quiz" },
      messages: [{ role: "user", content: [{ type: "text", text: `Study material:\n"""\n${trimmed.slice(0, 20000)}\n"""` }] }],
    });
    const toolUse = response.content.find((b) => b.type === "tool_use");
    const input = (toolUse && "input" in toolUse ? (toolUse.input as { title?: string; questions?: QuizQuestion[] }) : undefined) ?? {};
    if (!input.questions?.length) return { ok: false, error: "Couldn't make a quiz from that material." };
    return { ok: true, title: input.title || "Untitled quiz", questions: input.questions };
  } catch (err) {
    console.error("[study/quizzes] failed:", err);
    return { ok: false, error: "Couldn't generate a quiz right now. Try again shortly." };
  }
}
