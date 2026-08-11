import type { SupabaseClient } from "@supabase/supabase-js";
import type { ZodType } from "zod";

export interface ToolContext {
  supabase: SupabaseClient;
  userId: string;
  /** IANA timezone, e.g. "Europe/Athens". Falls back to UTC. */
  timezone: string;
  /** Server clock at the start of this request, for resolving "today"/"tomorrow". */
  now: Date;
}

export interface ToolResult<TData = unknown> {
  /** Short human summary, used in Activity log entries and confirmation replies. */
  summary: string;
  data?: TData;
  /** Populated for get_events-style tools so the Head Agent can hand Claude
   * only this, never the whole table. */
  contextForModel?: string;
}

export class ToolError extends Error {
  constructor(
    message: string,
    public code: "not_found" | "ambiguous" | "invalid_input" | "db_error" = "invalid_input"
  ) {
    super(message);
    this.name = "ToolError";
  }
}

export interface ToolDefinition<TParams = unknown> {
  /** Dot-namespaced, e.g. "calendar.create_event". */
  name: string;
  description: string;
  /** JSON Schema handed to Claude's tool-calling API. */
  inputSchema: Record<string, unknown>;
  /** Zod schema used to actually parse/validate params server-side — the
   * source of truth; inputSchema is a hand-kept mirror for Claude. */
  paramsSchema: ZodType<TParams>;
  /** Create/update/delete-shaped tools must be confirmed by the user before
   * execute() ever runs. Read-only tools run immediately. */
  requiresConfirmation: boolean;
  /** Human-readable preview shown on the confirmation card, e.g.
   * "Create 'Dentist appointment' — Tue Aug 18, 3:00–4:00 PM". */
  preview?: (params: TParams, ctx: ToolContext) => string | Promise<string>;
  execute: (params: TParams, ctx: ToolContext) => Promise<ToolResult>;
}
