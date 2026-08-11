import type Anthropic from "@anthropic-ai/sdk";
import type { ToolDefinition } from "./types";
import { createEventTool, getEventsTool, updateEventTool, deleteEventTool } from "./calendar";

/**
 * Every tool Alxioum can call, in one place. Adding a future agent (tasks,
 * habits, memory, finance, email, ...) means writing its tool file the same
 * shape as calendar.ts and pushing its tools into this array — nothing about
 * the Head Agent, the confirmation flow, or the API routes needs to change.
 */
export const toolRegistry: ToolDefinition<any>[] = [createEventTool, getEventsTool, updateEventTool, deleteEventTool];

export function getTool(name: string): ToolDefinition<any> | undefined {
  return toolRegistry.find((t) => t.name === name);
}

export function toolsForClaude(): Anthropic.Tool[] {
  return toolRegistry.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema as Anthropic.Tool.InputSchema,
  }));
}
