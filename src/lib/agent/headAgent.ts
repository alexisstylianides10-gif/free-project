import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { toolsForClaude, getTool } from "./tools/registry";
import type { ToolContext } from "./tools/types";
import { ToolError } from "./tools/types";

// Configurable so the product owner can change model/latency tradeoffs
// without a code change — defaults to Anthropic's current flagship model.
const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5";

let client: Anthropic | null = null;
export function isClaudeConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

export interface HeadAgentResult {
  reply: string;
  pendingAction?: { tool: string; params: unknown; preview: string };
}

function systemPrompt(nowIso: string, timezone: string) {
  return `You are the Head Agent for Alxioum, an AI personal assistant. You turn natural-language requests into real actions using the tools available to you — you don't just describe what could be done, you do it (with the user's confirmation for anything that changes their data).

Current date and time: ${nowIso} (timezone: ${timezone}). Use this to resolve every relative date or time the user gives you ("tomorrow", "next Tuesday", "Friday at 4") into an absolute ISO 8601 datetime yourself before calling a tool — never pass a relative phrase into a tool parameter.

Rules:
- A request that only reads the calendar ("what do I have this week", "when's my dentist appointment") calls calendar_get_events and answers using only the events it returns — never invent events.
- A request that creates, updates, or deletes an event calls the matching tool exactly once with your best-understood parameters. The user is always shown a confirmation card before anything is actually saved or changed, so don't ask "should I confirm this?" in your own reply — that confirmation step happens automatically after your tool call.
- If a request is genuinely missing information you need to act (no date, no time, no title), ask one direct clarifying question instead of guessing or calling a tool.
- If a tool reports an event wasn't found or the request was ambiguous, relay that plainly and ask for the detail that would resolve it.
- Keep replies short, direct, and conversational — this is a chat interface, not a report.
- You are Alxioum. If asked what model, AI, or company is behind you, answer as Alxioum — e.g. "I'm Alxioum, your personal AI assistant" — and don't name any underlying model or vendor.`;
}

export async function runHeadAgent(opts: {
  history: { role: "user" | "assistant"; content: string }[];
  userMessage: string;
  ctx: ToolContext;
}): Promise<HeadAgentResult> {
  if (!isClaudeConfigured()) {
    return {
      reply:
        "Alxioum's AI isn't configured yet on this deployment — an ANTHROPIC_API_KEY is missing. Everything else (calendar, accounts, activity log) is fully working; the AI just can't respond until that key is added.",
    };
  }

  const anthropic = getClient();
  const system = systemPrompt(opts.ctx.now.toISOString(), opts.ctx.timezone);
  const messages: Anthropic.MessageParam[] = [
    ...opts.history.map((m) => ({ role: m.role, content: m.content }) as Anthropic.MessageParam),
    { role: "user", content: opts.userMessage },
  ];

  let response: Anthropic.Message;
  try {
    response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system,
      tools: toolsForClaude(),
      output_config: { effort: "medium" },
      messages,
    });
  } catch (err) {
    console.error("[headAgent] Claude request failed:", err instanceof Error ? err.message : err);
    return { reply: describeClaudeError(err) };
  }

  if (response.stop_reason === "refusal") {
    return { reply: "I'm not able to help with that request." };
  }

  const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  const leadText = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  if (!toolUse) {
    return { reply: leadText || "I'm not sure how to help with that — could you rephrase?" };
  }

  const tool = getTool(toolUse.name);
  if (!tool) {
    return { reply: "I tried to use a tool that isn't available. Let's try that again." };
  }

  const parsed = tool.paramsSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    return { reply: "I didn't get quite enough detail to do that — could you be more specific?" };
  }
  const params = parsed.data;

  if (!tool.requiresConfirmation) {
    try {
      const result = await tool.execute(params, opts.ctx);
      const followup = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system,
        tools: toolsForClaude(),
        output_config: { effort: "medium" },
        messages: [
          ...messages,
          { role: "assistant", content: response.content },
          {
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: toolUse.id,
                content: result.contextForModel ?? result.summary,
              },
            ],
          },
        ],
      });
      const finalText = followup.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      return { reply: finalText || result.summary };
    } catch (err) {
      if (err instanceof ToolError) return { reply: err.message };
      return { reply: "Something went wrong reading your calendar. Please try again." };
    }
  }

  try {
    const preview = tool.preview ? await tool.preview(params, opts.ctx) : tool.name;
    return {
      reply: leadText || "Here's what I'll do:",
      pendingAction: { tool: tool.name, params, preview },
    };
  } catch (err) {
    if (err instanceof ToolError) return { reply: err.message };
    return { reply: "I couldn't prepare that action. Please try again." };
  }
}

function describeClaudeError(err: unknown): string {
  if (err instanceof Anthropic.RateLimitError) {
    return "Alxioum is getting a lot of requests right now — please try again in a moment.";
  }
  if (err instanceof Anthropic.AuthenticationError) {
    return "Alxioum's AI isn't configured correctly on this deployment (invalid API key).";
  }
  if (err instanceof Anthropic.APIError) {
    return "Alxioum's AI had trouble responding just now. Please try again.";
  }
  return "Something went wrong reaching Alxioum's AI. Please try again.";
}
