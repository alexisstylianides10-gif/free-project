import type { SupabaseClient } from "@supabase/supabase-js";
import type { ToolAction } from "@/lib/types";

export interface ToolContext {
  supabase: SupabaseClient;
  userId: string;
  timezone: string;
  today: string; // ISO date, in the user's timezone
  /** The conversation this turn belongs to. Unset when a tool runs outside a chat turn (e.g. confirming a pending action later). */
  conversationId?: string;
}

export type ToolResult = { ok: true; result: unknown } | { ok: false; error: string };
export type DescribeResult = { summary: string } | { error: string };

export interface ToolSpec<TInput = Record<string, unknown>> {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  /** Read-only tools execute immediately in the same turn. */
  consequential: boolean;
  action?: ToolAction;
  /** Short present-tense status shown to the user while this tool is running, e.g. "Checking your calendar…". Falls back to a generic "Thinking…" when unset. */
  statusLabel?: string;
  /**
   * For consequential tools: builds the human-readable confirmation summary
   * shown before execution. Has DB access so it can do things like conflict
   * detection or "does this row still exist" checks, and can fail with a
   * clear error instead of proposing an action on bad input.
   */
  describe?: (ctx: ToolContext, input: TInput) => Promise<DescribeResult>;
  execute: (ctx: ToolContext, input: TInput) => Promise<ToolResult>;
}
