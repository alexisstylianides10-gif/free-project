/**
 * AIProvider — the abstraction boundary between Alxioum's product/business
 * logic and whichever model actually powers the Head Agent. Everything in
 * headAgent.ts and the tool registry talks to this interface, never to an
 * SDK directly, so swapping Claude for another provider later is a new file
 * that implements this shape, not a rewrite of the agent.
 */

export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"; data: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; toolUseId: string; content: string; isError?: boolean };

export interface ProviderMessage {
  role: "user" | "assistant";
  content: ContentBlock[];
}

export interface ProviderTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ProviderResponse {
  content: ContentBlock[];
  stopReason: "end_turn" | "tool_use" | "max_tokens" | "other";
  usage: { inputTokens: number; outputTokens: number };
}

export interface CreateMessageArgs {
  system: string;
  messages: ProviderMessage[];
  tools: ProviderTool[];
  maxTokens: number;
}

export interface AIProvider {
  readonly name: string;
  createMessage(args: CreateMessageArgs): Promise<ProviderResponse>;
}
