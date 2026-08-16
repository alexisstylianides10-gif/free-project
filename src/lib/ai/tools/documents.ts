import type { ToolSpec } from "./types";
import { askDocument } from "@/lib/documents/ask";

interface DocumentRow {
  id: string;
  name: string;
  mime_type: string;
  summary: string;
  created_at: string;
  category: string | null;
  tags: string[];
  starred: boolean;
  document_type: string | null;
  people: string[];
  organizations: string[];
  amounts: { label: string; value: string; currency?: string }[];
  locations: string[];
  key_topics: string[];
  storage_path: string;
}

function documentSummary(d: Pick<DocumentRow, "id" | "name" | "mime_type" | "summary" | "created_at" | "category" | "tags" | "starred">) {
  return {
    id: d.id,
    name: d.name,
    mimeType: d.mime_type,
    summary: d.summary,
    createdAt: d.created_at,
    category: d.category,
    tags: d.tags,
    starred: d.starred,
  };
}

export const documentsSearch: ToolSpec<{ query?: string; category?: string; starredOnly?: boolean }> = {
  name: "documents_search",
  description: "Search the user's uploaded documents by name, summary, extracted text, tags, or category. Use this to find a document before documents_read or documents_delete.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Free-text search — matches name, summary, extracted text, tags, and category." },
      category: { type: "string" },
      starredOnly: { type: "boolean" },
    },
  },
  consequential: false,
  execute: async (ctx, input) => {
    if (input.query?.trim()) {
      const { data, error } = await ctx.supabase.rpc("search_documents", { p_user_id: ctx.userId, p_query: input.query.trim(), p_limit: 20 });
      if (error) return { ok: false, error: error.message };
      let rows = data as DocumentRow[];
      if (input.category) rows = rows.filter((d) => d.category === input.category);
      if (input.starredOnly) rows = rows.filter((d) => d.starred);
      return { ok: true, result: { documents: rows.map(documentSummary) } };
    }
    let q = ctx.supabase.from("documents").select("id,name,mime_type,summary,created_at,category,tags,starred").eq("user_id", ctx.userId);
    if (input.category) q = q.eq("category", input.category);
    if (input.starredOnly) q = q.eq("starred", true);
    const { data, error } = await q.order("created_at", { ascending: false }).limit(20);
    if (error) return { ok: false, error: error.message };
    return { ok: true, result: { documents: (data as Omit<DocumentRow, "document_type" | "people" | "organizations" | "amounts" | "locations" | "key_topics" | "storage_path">[]).map(documentSummary) } };
  },
};

export const documentsRead: ToolSpec<{ documentId: string }> = {
  name: "documents_read",
  description:
    "Get the full stored analysis for one document — summary, extracted dates, extracted tasks, and any people/organizations/amounts/locations/topics found (use documents_search first to resolve the id). Use this to answer the user's question directly, or to propose a documents_add_dates_to_calendar / documents_create_tasks action.",
  inputSchema: { type: "object", properties: { documentId: { type: "string" } }, required: ["documentId"] },
  consequential: false,
  execute: async (ctx, input) => {
    const { data, error } = await ctx.supabase
      .from("documents")
      .select("id,name,mime_type,summary,created_at,category,tags,starred,document_type,people,organizations,amounts,locations,key_topics")
      .eq("id", input.documentId)
      .eq("user_id", ctx.userId)
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: "I couldn't find that document." };
    const row = data as Omit<DocumentRow, "storage_path">;

    const [{ data: dates }, { data: tasksFound }] = await Promise.all([
      ctx.supabase.from("document_dates").select("id,label,date,kind,description").eq("document_id", row.id).eq("user_id", ctx.userId),
      ctx.supabase.from("document_tasks").select("id,title,description").eq("document_id", row.id).eq("user_id", ctx.userId),
    ]);

    return {
      ok: true,
      result: {
        ...documentSummary(row),
        documentType: row.document_type,
        people: row.people,
        organizations: row.organizations,
        amounts: row.amounts,
        locations: row.locations,
        keyTopics: row.key_topics,
        dates: dates ?? [],
        tasksFound: tasksFound ?? [],
      },
    };
  },
};

export const documentsDelete: ToolSpec<{ documentId: string }> = {
  name: "documents_delete",
  description: "Propose permanently deleting a document. Requires the exact documentId from documents_search.",
  inputSchema: { type: "object", properties: { documentId: { type: "string" } }, required: ["documentId"] },
  consequential: true,
  action: "delete",
  describe: async (ctx, input) => {
    const { data, error } = await ctx.supabase.from("documents").select("id,name").eq("id", input.documentId).eq("user_id", ctx.userId).maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: "I couldn't find that document — it may already be deleted." };
    return { summary: `Delete "${data.name}"? This also removes its AI-generated index.` };
  },
  execute: async (ctx, input) => {
    const { data, error } = await ctx.supabase.from("documents").select("id,name,storage_path").eq("id", input.documentId).eq("user_id", ctx.userId).maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: "Document no longer exists." };
    await ctx.supabase.storage.from("documents").remove([data.storage_path]);
    const { error: deleteError } = await ctx.supabase.from("documents").delete().eq("id", input.documentId).eq("user_id", ctx.userId);
    if (deleteError) return { ok: false, error: deleteError.message };
    return { ok: true, result: { deleted: { id: data.id, name: data.name } } };
  },
};

export const documentsAsk: ToolSpec<{ documentId: string; question: string }> = {
  name: "documents_ask",
  description:
    "Ask a grounded question about ONE specific document (its real content, re-sent to Claude — not the stored summary). Requires the exact documentId from documents_search. Use this for questions that need to be answered from the document's actual text/pages, e.g. 'summarize page 4' or 'does this mention a fee'. Persists the exchange so the user sees it if they open the document.",
  inputSchema: {
    type: "object",
    properties: { documentId: { type: "string" }, question: { type: "string" } },
    required: ["documentId", "question"],
  },
  consequential: false,
  execute: async (ctx, input) => {
    const outcome = await askDocument(ctx.supabase, ctx.userId, input.documentId, input.question);
    if (!outcome.ok) return { ok: false, error: outcome.error };
    return { ok: true, result: outcome.result };
  },
};

export const documentTools = [documentsSearch, documentsRead, documentsDelete, documentsAsk];
