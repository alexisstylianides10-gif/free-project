import Anthropic from "@anthropic-ai/sdk";

let cachedClient: Anthropic | null = null;
function anthropic(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");
  if (!cachedClient) cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

const BREAKDOWN_TOOL: Anthropic.Messages.Tool = {
  name: "propose_subtasks",
  description: "Propose concrete subtasks that break a task into smaller steps. This is a suggestion only — the user reviews it before anything is saved.",
  input_schema: {
    type: "object",
    properties: {
      subtasks: {
        type: "array",
        minItems: 3,
        maxItems: 6,
        description: "Concrete, sequential steps that break the task down — specific and actionable, not vague. Never invent scope the task doesn't imply.",
        items: { type: "string" },
      },
    },
    required: ["subtasks"],
  },
};

export type BreakdownOutcome = { ok: true; subtasks: string[] } | { ok: false; error: string };

/** Grounded only in the task's own title/description — never invents scope. Mirrors /api/goals/decompose's honesty rules. */
export async function breakdownTask(title: string, description?: string): Promise<BreakdownOutcome> {
  try {
    const response = await anthropic().messages.create({
      model: process.env.ALXIOUM_MODEL || "claude-sonnet-4-5-20250929",
      max_tokens: 600,
      system:
        "You are helping someone break a task down into concrete steps. Only propose subtasks that are genuinely implied by the task's own title and description — never invent additional scope or requirements that aren't there. If the task is already a single simple action with no real sub-steps, say so honestly by returning fewer subtasks rather than padding with filler.",
      tools: [BREAKDOWN_TOOL],
      tool_choice: { type: "tool", name: "propose_subtasks" },
      messages: [{ role: "user", content: [{ type: "text", text: `Task: "${title}"${description ? `\nDescription: ${description}` : ""}` }] }],
    });
    const toolUse = response.content.find((b) => b.type === "tool_use");
    const input = (toolUse && "input" in toolUse ? (toolUse.input as { subtasks?: string[] }) : undefined) ?? {};
    if (!input.subtasks?.length) return { ok: false, error: "Couldn't break that task down further." };
    return { ok: true, subtasks: input.subtasks };
  } catch (err) {
    console.error("[tasks/breakdown] failed:", err);
    return { ok: false, error: "Couldn't break that task down right now. Try again shortly." };
  }
}
