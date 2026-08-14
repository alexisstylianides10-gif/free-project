import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, ContentBlock, CreateMessageArgs, ProviderResponse } from "./provider";

const MODEL = process.env.ALXIOUM_MODEL || "claude-sonnet-4-5-20250929";

let cachedClient: Anthropic | null = null;
function client(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured on the server.");
  if (!cachedClient) cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

type AnthropicContentParam =
  | Anthropic.Messages.TextBlockParam
  | Anthropic.Messages.ImageBlockParam
  | Anthropic.Messages.ToolUseBlockParam
  | Anthropic.Messages.ToolResultBlockParam;

function toAnthropicContent(blocks: ContentBlock[]): AnthropicContentParam[] {
  return blocks.map((b): AnthropicContentParam => {
    if (b.type === "text") return { type: "text", text: b.text };
    if (b.type === "image") return { type: "image", source: { type: "base64", media_type: b.mediaType, data: b.data } };
    if (b.type === "tool_use") return { type: "tool_use", id: b.id, name: b.name, input: b.input };
    return { type: "tool_result", tool_use_id: b.toolUseId, content: b.content, is_error: b.isError };
  });
}

function fromAnthropicContent(blocks: Anthropic.Messages.ContentBlock[]): ContentBlock[] {
  return blocks
    .map((b): ContentBlock | null => {
      if (b.type === "text") return { type: "text", text: b.text };
      if (b.type === "tool_use") return { type: "tool_use", id: b.id, name: b.name, input: b.input as Record<string, unknown> };
      return null;
    })
    .filter((b): b is ContentBlock => b !== null);
}

export class ClaudeProvider implements AIProvider {
  readonly name = "claude";

  async createMessage({ system, messages, tools, maxTokens, enableWebSearch }: CreateMessageArgs): Promise<ProviderResponse> {
    const clientTools: Anthropic.Messages.ToolUnion[] = tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema as Anthropic.Messages.Tool.InputSchema,
    }));
    if (enableWebSearch) {
      clientTools.push({ type: "web_search_20250305", name: "web_search", max_uses: 5 });
    }

    const response = await client().messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      tools: clientTools,
      messages: messages.map((m) => ({ role: m.role, content: toAnthropicContent(m.content) })),
    });

    const stopReason: ProviderResponse["stopReason"] =
      response.stop_reason === "tool_use"
        ? "tool_use"
        : response.stop_reason === "end_turn" || response.stop_reason === "stop_sequence"
          ? "end_turn"
          : response.stop_reason === "max_tokens"
            ? "max_tokens"
            : "other";

    return {
      content: fromAnthropicContent(response.content),
      stopReason,
      usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
    };
  }
}
