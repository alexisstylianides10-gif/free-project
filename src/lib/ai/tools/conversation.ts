import type { ToolSpec } from "./types";

export const conversationRename: ToolSpec<{ title: string }> = {
  name: "conversation_rename",
  description:
    "Rename the chat conversation you're currently in. Use this whenever the user explicitly asks to rename, retitle, or change the name of this chat. Executes immediately — renaming is low-stakes and doesn't need confirmation.",
  inputSchema: {
    type: "object",
    properties: {
      title: { type: "string", description: "The new conversation title. Keep it short — under ~50 characters." },
    },
    required: ["title"],
  },
  consequential: false,
  execute: async (ctx, input) => {
    if (!ctx.conversationId) return { ok: false, error: "No active conversation to rename." };
    const title = input.title.trim().slice(0, 80);
    if (!title) return { ok: false, error: "Title can't be empty." };
    const { error } = await ctx.supabase
      .from("conversations")
      .update({ title, updated_at: new Date().toISOString() })
      .eq("id", ctx.conversationId)
      .eq("user_id", ctx.userId);
    if (error) return { ok: false, error: error.message };
    return { ok: true, result: { title } };
  },
};

export const conversationTools = [conversationRename];
