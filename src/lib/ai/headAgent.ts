import type { AIProvider, ContentBlock, ProviderMessage } from "./provider";
import { allTools, getTool } from "./tools";
import type { ToolContext } from "./tools/types";
import type { ToolAction } from "@/lib/types";
import { buildContextSummary } from "./context";
import { buildSystemPrompt } from "./systemPrompt";

export interface ProposedAction {
  tool: string;
  action: ToolAction;
  args: Record<string, unknown>;
  summary: string;
}

export interface HeadAgentResult {
  content: string;
  toolCalls: { tool: string; status: "success" | "failed" }[];
  proposedAction: ProposedAction | null;
  usage: { inputTokens: number; outputTokens: number };
}

const MAX_TOOL_ROUNDS = 4;

export async function runHeadAgent(params: {
  provider: AIProvider;
  ctx: ToolContext;
  history: { role: "user" | "assistant"; content: string }[];
  userText: string;
  maxTokens: number;
}): Promise<HeadAgentResult> {
  const { provider, ctx, history, userText, maxTokens } = params;

  const contextSummary = await buildContextSummary(ctx);
  const system = buildSystemPrompt(contextSummary);

  const messages: ProviderMessage[] = [
    ...history.map((h): ProviderMessage => ({ role: h.role, content: [{ type: "text", text: h.content }] })),
    { role: "user", content: [{ type: "text", text: userText }] },
  ];

  const toolDefs = allTools.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }));
  const usage = { inputTokens: 0, outputTokens: 0 };
  const toolCalls: HeadAgentResult["toolCalls"] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await provider.createMessage({ system, messages, tools: toolDefs, maxTokens });
    usage.inputTokens += response.usage.inputTokens;
    usage.outputTokens += response.usage.outputTokens;

    const textParts = response.content.filter((b): b is Extract<ContentBlock, { type: "text" }> => b.type === "text").map((b) => b.text).join("\n\n");
    const toolUses = response.content.filter((b): b is Extract<ContentBlock, { type: "tool_use" }> => b.type === "tool_use");

    if (toolUses.length === 0) {
      return { content: textParts || "I'm not sure how to help with that yet — could you rephrase?", toolCalls, proposedAction: null, usage };
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

      if (!spec.consequential) {
        const result = await spec.execute(ctx, call.input);
        toolCalls.push({ tool: spec.name, status: result.ok ? "success" : "failed" });
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
      return { content, toolCalls, proposedAction, usage };
    }

    messages.push({ role: "user", content: toolResults });
  }

  return {
    content: "I looked into this but need a bit more detail to narrow it down — could you tell me exactly what you mean?",
    toolCalls,
    proposedAction: null,
    usage,
  };
}
