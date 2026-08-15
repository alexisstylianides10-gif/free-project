import type { ToolSpec } from "./types";

interface DocumentRow {
  id: string;
  name: string;
  mime_type: string;
  summary: string;
  extracted_dates: { label: string; date: string }[];
  created_at: string;
}

export const documentsSearch: ToolSpec<{ query?: string }> = {
  name: "documents_search",
  description: "List the user's uploaded documents, optionally filtered by filename. Use this to find a document before documents_read.",
  inputSchema: { type: "object", properties: { query: { type: "string" } } },
  consequential: false,
  execute: async (ctx, input) => {
    let q = ctx.supabase.from("documents").select("id,name,mime_type,summary,created_at").eq("user_id", ctx.userId);
    if (input.query) q = q.ilike("name", `%${input.query}%`);
    const { data, error } = await q.order("created_at", { ascending: false }).limit(20);
    if (error) return { ok: false, error: error.message };
    return {
      ok: true,
      result: {
        documents: (data as Omit<DocumentRow, "extracted_dates">[]).map((d) => ({ id: d.id, name: d.name, mimeType: d.mime_type, summary: d.summary, createdAt: d.created_at })),
      },
    };
  },
};

export const documentsRead: ToolSpec<{ documentId: string }> = {
  name: "documents_read",
  description:
    "Get the full stored summary and extracted dates for one document (use documents_search first to resolve the id). Use the returned summary/dates to answer the user's question directly, or to propose a tasks_create / calendar_create action for a deadline found in it.",
  inputSchema: { type: "object", properties: { documentId: { type: "string" } }, required: ["documentId"] },
  consequential: false,
  execute: async (ctx, input) => {
    const { data, error } = await ctx.supabase
      .from("documents")
      .select("id,name,mime_type,summary,extracted_dates,created_at")
      .eq("id", input.documentId)
      .eq("user_id", ctx.userId)
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: "I couldn't find that document." };
    const row = data as DocumentRow;
    return {
      ok: true,
      result: { id: row.id, name: row.name, mimeType: row.mime_type, summary: row.summary, extractedDates: row.extracted_dates ?? [], createdAt: row.created_at },
    };
  },
};

export const documentTools = [documentsSearch, documentsRead];
