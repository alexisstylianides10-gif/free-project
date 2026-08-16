import type { ToolSpec } from "./types";

const CATEGORIES = ["Preferences", "Important dates", "People", "Routines", "Facts"] as const;

interface MemoryRow {
  id: string;
  category: string;
  content: string;
}

export const memoryList: ToolSpec<{ activeOnly?: boolean }> = {
  name: "memory_list",
  statusLabel: "Checking memory…",
  description: "List what Alxioum currently remembers about the user. Use this to answer 'what do you remember about me' or before deleting a memory.",
  inputSchema: { type: "object", properties: { activeOnly: { type: "boolean" } } },
  consequential: false,
  execute: async (ctx, input) => {
    let q = ctx.supabase.from("memory").select("*").eq("user_id", ctx.userId);
    if (input.activeOnly !== false) q = q.eq("active", true);
    const { data, error } = await q.order("created_at", { ascending: false });
    if (error) return { ok: false, error: error.message };
    const rows = data as MemoryRow[];
    return { ok: true, result: { count: rows.length, memories: rows.map((m) => ({ id: m.id, category: m.category, content: m.content })) } };
  },
};

export const memoryCreate: ToolSpec<{ category?: (typeof CATEGORIES)[number]; content: string; reason: string }> = {
  name: "memory_create",
  statusLabel: "Saving to memory…",
  description:
    "Propose saving a new memory about the user. Only call this when the user explicitly asks you to remember something — never infer and silently save personal facts from casual conversation.",
  inputSchema: {
    type: "object",
    properties: {
      category: { type: "string", enum: CATEGORIES as unknown as string[] },
      content: { type: "string", description: "The fact to remember, written plainly, e.g. 'Prefers morning meetings.'" },
      reason: { type: "string", description: "Why this is worth remembering, one short sentence." },
    },
    required: ["content", "reason"],
  },
  consequential: true,
  action: "create",
  describe: async (_ctx, input) => ({ summary: `Remember: "${input.content}"?` }),
  execute: async (ctx, input) => {
    const { data, error } = await ctx.supabase
      .from("memory")
      .insert({ user_id: ctx.userId, category: input.category ?? "Facts", content: input.content, reason: input.reason, source: "ai", active: true })
      .select("*")
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, result: { memory: data } };
  },
};

export const memoryDelete: ToolSpec<{ memoryId: string }> = {
  name: "memory_delete",
  statusLabel: "Updating memory…",
  description: "Propose forgetting (deleting) a stored memory. Requires the exact memoryId from memory_list.",
  inputSchema: { type: "object", properties: { memoryId: { type: "string" } }, required: ["memoryId"] },
  consequential: true,
  action: "delete",
  describe: async (ctx, input) => {
    const { data, error } = await ctx.supabase.from("memory").select("*").eq("id", input.memoryId).eq("user_id", ctx.userId).maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: "I couldn't find that memory — it may already be gone." };
    return { summary: `Forget "${(data as MemoryRow).content}"?` };
  },
  execute: async (ctx, input) => {
    const { data, error } = await ctx.supabase.from("memory").delete().eq("id", input.memoryId).eq("user_id", ctx.userId).select("id,content").maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: "Memory no longer exists." };
    return { ok: true, result: { deleted: data } };
  },
};

export const memoryTools = [memoryList, memoryCreate, memoryDelete];
