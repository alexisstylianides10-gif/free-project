import type { AIProvider, ContentBlock, ProviderMessage } from "./provider";
import { allTools, getTool } from "./tools";
import type { ToolContext } from "./tools/types";
import type { ToolAction } from "@/lib/types";
import { buildContextSummary } from "./context";
import { buildSystemPrompt } from "./systemPrompt";
import { buildCardsForTool } from "./cardBuilders";
import type { ResponseCard } from "./cards";

export interface ProposedAction {
  tool: string;
  action: ToolAction;
  args: Record<string, unknown>;
  summary: string;
}

export interface Choice {
  label: string;
  value: string;
}

export interface HeadAgentResult {
  content: string;
  toolCalls: { tool: string; status: "success" | "failed" }[];
  proposedAction: ProposedAction | null;
  cards: ResponseCard[];
  choices: Choice[] | null;
  usage: { inputTokens: number; outputTokens: number };
}

const MAX_TOOL_ROUNDS = 4;

export async function runHeadAgent(params: {
  provider: AIProvider;
  ctx: ToolContext;
  history: { role: "user" | "assistant"; content: string }[];
  userText: string;
  image?: { mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"; data: string };
  maxTokens: number;
  /** Fired with a short present-tense status ("Checking your calendar…") as the agent progresses — purely for UI feedback, never awaited/blocking. */
  onStatus?: (label: string) => void;
}): Promise<HeadAgentResult> {
  const { provider, ctx, history, userText, image, maxTokens, onStatus } = params;

  const contextSummary = await buildContextSummary(ctx);
  const system = buildSystemPrompt(contextSummary);

  const userContent: ContentBlock[] = [];
  if (image) userContent.push({ type: "image", mediaType: image.mediaType, data: image.data });
  userContent.push({ type: "text", text: userText || "What should I add based on this photo?" });

  const messages: ProviderMessage[] = [
    ...history.map((h): ProviderMessage => ({ role: h.role, content: [{ type: "text", text: h.content }] })),
    { role: "user", content: userContent },
  ];

  const toolDefs = allTools.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }));
  const usage = { inputTokens: 0, outputTokens: 0 };
  const toolCalls: HeadAgentResult["toolCalls"] = [];
  const cards: ResponseCard[] = [];

  onStatus?.("Thinking…");

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await provider.createMessage({ system, messages, tools: toolDefs, maxTokens });
    usage.inputTokens += response.usage.inputTokens;
    usage.outputTokens += response.usage.outputTokens;

    const textParts = response.content.filter((b): b is Extract<ContentBlock, { type: "text" }> => b.type === "text").map((b) => b.text).join("\n\n");
    const toolUses = response.content.filter((b): b is Extract<ContentBlock, { type: "tool_use" }> => b.type === "tool_use");

    if (toolUses.length === 0) {
      return { content: textParts || "I'm not sure how to help with that yet — could you rephrase?", toolCalls, proposedAction: null, cards, choices: null, usage };
    }

    messages.push({ role: "assistant", content: response.content });

    const toolResults: ContentBlock[] = [];
    let proposedAction: ProposedAction | null = null;

    for (const call of toolUses) {
      const spec = getTool(call.name);
      if (!spec) {
        toolResults.push({ type: "tool_result", toolUseId: call.id, content: `Unknown tool "${call.name}".`, isError: true });
        continue;
      }

      if (spec.name === "chat_present_choices") {
        const result = await spec.execute(ctx, call.input);
        if (result.ok) {
          const input = result.result as { question: string; options: Choice[] };
          return { content: input.question, toolCalls, proposedAction: null, cards, choices: input.options, usage };
        }
        toolResults.push({ type: "tool_result", toolUseId: call.id, content: result.error, isError: true });
        continue;
      }

      if (!spec.consequential) {
        onStatus?.(spec.statusLabel ?? "Thinking…");
        const result = await spec.execute(ctx, call.input);
        toolCalls.push({ tool: spec.name, status: result.ok ? "success" : "failed" });
        if (result.ok) cards.push(...buildCardsForTool(spec.name, result.result));
        toolResults.push({
          type: "tool_result",
          toolUseId: call.id,
          content: JSON.stringify(result.ok ? result.result : { error: result.error }),
          isError: !result.ok,
        });
        continue;
      }

      if (proposedAction) {
        toolResults.push({
          type: "tool_result",
          toolUseId: call.id,
          content: "Only one action can be proposed at a time. Finish confirming or cancelling the previous one first.",
          isError: true,
        });
        continue;
      }

      onStatus?.(spec.statusLabel ?? "Preparing that…");
      const described = spec.describe ? await spec.describe(ctx, call.input) : { summary: `${spec.name} ${JSON.stringify(call.input)}` };
      if ("error" in described) {
        toolResults.push({ type: "tool_result", toolUseId: call.id, content: described.error, isError: true });
        toolCalls.push({ tool: spec.name, status: "failed" });
        continue;
      }

      proposedAction = { tool: spec.name, action: spec.action as ToolAction, args: call.input, summary: described.summary };
      toolResults.push({ type: "tool_result", toolUseId: call.id, content: `Proposed — awaiting user confirmation: ${described.summary}` });
    }

    if (proposedAction) {
      const lead = textParts.trim();
      const content = lead && lead !== proposedAction.summary ? `${lead}\n\n${proposedAction.summary}` : proposedAction.summary;
      return { content, toolCalls, proposedAction, cards, choices: null, usage };
    }

    messages.push({ role: "user", content: toolResults });
  }

  return {
    content: "I looked into this but need a bit more detail to narrow it down — could you tell me exactly what you mean?",
    toolCalls,
    proposedAction: null,
    cards,
    choices: null,
    usage,
  };
}
