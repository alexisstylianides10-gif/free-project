import type { ToolSpec } from "./types";
import { askDocument } from "@/lib/documents/ask";
import { askAllDocuments } from "@/lib/documents/askAll";

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
  statusLabel: "Searching documents…",
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
  statusLabel: "Opening the document…",
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
  statusLabel: "Updating documents…",
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
  statusLabel: "Reading the document…",
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

export const documentsAskAll: ToolSpec<{ question: string }> = {
  name: "documents_ask_all",
  statusLabel: "Searching documents…",
  description:
    "Ask a question across ALL of the user's documents at once (not just one) — use this for questions like 'what's due soon across my documents?' or 'which of my documents mentions a deposit?'. Retrieves the most relevant documents via search and grounds the answer in their summaries/content, citing which document(s) it drew from.",
  inputSchema: { type: "object", properties: { question: { type: "string" } }, required: ["question"] },
  consequential: false,
  execute: async (ctx, input) => {
    const outcome = await askAllDocuments(ctx.supabase, ctx.userId, input.question);
    if (!outcome.ok) return { ok: false, error: outcome.error };
    return { ok: true, result: outcome.result };
  },
};

interface DocumentDateRow {
  id: string;
  document_id: string;
  label: string;
  date: string;
  kind: string;
  added_to_calendar_event_id: string | null;
}

interface DocumentTaskRow {
  id: string;
  document_id: string;
  title: string;
  description: string;
  created_task_id: string | null;
}

export const documentsFindDates: ToolSpec<{ upcomingOnly?: boolean }> = {
  name: "documents_find_dates",
  statusLabel: "Checking document deadlines…",
  description: "List dates/deadlines extracted from ALL of the user's documents (not just one). Use this for questions like 'what deadlines are in my documents?'. Returns which document each date came from.",
  inputSchema: { type: "object", properties: { upcomingOnly: { type: "boolean", description: "If true, only include dates from today onward." } } },
  consequential: false,
  execute: async (ctx, input) => {
    let q = ctx.supabase.from("document_dates").select("id,document_id,label,date,kind,added_to_calendar_event_id").eq("user_id", ctx.userId);
    if (input.upcomingOnly) q = q.gte("date", ctx.today);
    const { data, error } = await q.order("date", { ascending: true }).limit(50);
    if (error) return { ok: false, error: error.message };
    const rows = (data ?? []) as DocumentDateRow[];
    const docIds = Array.from(new Set(rows.map((r) => r.document_id)));
    const { data: docs } = await ctx.supabase.from("documents").select("id,name").in("id", docIds.length ? docIds : ["00000000-0000-0000-0000-000000000000"]);
    const nameById = new Map((docs ?? []).map((d: { id: string; name: string }) => [d.id, d.name]));
    return {
      ok: true,
      result: {
        dates: rows.map((r) => ({
          id: r.id,
          documentId: r.document_id,
          documentName: nameById.get(r.document_id) ?? "Unknown document",
          label: r.label,
          date: r.date,
          kind: r.kind,
          addedToCalendar: Boolean(r.added_to_calendar_event_id),
        })),
      },
    };
  },
};

export const documentsFindTasks: ToolSpec<{ pendingOnly?: boolean }> = {
  name: "documents_find_tasks",
  statusLabel: "Checking document requirements…",
  description: "List actionable requirements extracted from ALL of the user's documents (not just one). Use this for questions like 'what do my documents ask me to do?'.",
  inputSchema: { type: "object", properties: { pendingOnly: { type: "boolean", description: "If true, only include tasks not yet turned into a real task." } } },
  consequential: false,
  execute: async (ctx, input) => {
    let q = ctx.supabase.from("document_tasks").select("id,document_id,title,description,created_task_id").eq("user_id", ctx.userId);
    if (input.pendingOnly) q = q.is("created_task_id", null);
    const { data, error } = await q.order("created_at", { ascending: true }).limit(50);
    if (error) return { ok: false, error: error.message };
    const rows = (data ?? []) as DocumentTaskRow[];
    const docIds = Array.from(new Set(rows.map((r) => r.document_id)));
    const { data: docs } = await ctx.supabase.from("documents").select("id,name").in("id", docIds.length ? docIds : ["00000000-0000-0000-0000-000000000000"]);
    const nameById = new Map((docs ?? []).map((d: { id: string; name: string }) => [d.id, d.name]));
    return {
      ok: true,
      result: {
        tasksFound: rows.map((r) => ({
          id: r.id,
          documentId: r.document_id,
          documentName: nameById.get(r.document_id) ?? "Unknown document",
          title: r.title,
          description: r.description,
          alreadyCreated: Boolean(r.created_task_id),
        })),
      },
    };
  },
};

export const documentsAddDatesToCalendar: ToolSpec<{ documentDateIds: string[] }> = {
  name: "documents_add_dates_to_calendar",
  statusLabel: "Adding to your calendar…",
  description: "Propose adding one or more extracted document dates to the calendar, bundled behind ONE confirmation. Requires exact documentDateIds from documents_find_dates or documents_read — never invent an id.",
  inputSchema: { type: "object", properties: { documentDateIds: { type: "array", items: { type: "string" } } }, required: ["documentDateIds"] },
  consequential: true,
  action: "create",
  describe: async (ctx, input) => {
    const { data, error } = await ctx.supabase.from("document_dates").select("id,label,date").eq("user_id", ctx.userId).in("id", input.documentDateIds);
    if (error) return { error: error.message };
    if (!data?.length) return { error: "I couldn't find those dates." };
    return { summary: `Add ${data.length} date${data.length > 1 ? "s" : ""} to the calendar: ${data.map((d: { label: string; date: string }) => `"${d.label}" (${d.date})`).join(", ")}?` };
  },
  execute: async (ctx, input) => {
    const { data: rows, error } = await ctx.supabase
      .from("document_dates")
      .select("id,document_id,label,date")
      .eq("user_id", ctx.userId)
      .in("id", input.documentDateIds);
    if (error) return { ok: false, error: error.message };
    if (!rows?.length) return { ok: false, error: "Those dates no longer exist." };

    const { data: docRows } = await ctx.supabase.from("documents").select("id,name").in("id", Array.from(new Set(rows.map((r: { document_id: string }) => r.document_id))));
    const nameById = new Map((docRows ?? []).map((d: { id: string; name: string }) => [d.id, d.name]));

    const created: unknown[] = [];
    const failures: string[] = [];
    for (const d of rows as { id: string; document_id: string; label: string; date: string }[]) {
      const { data: event, error: eventError } = await ctx.supabase
        .from("events")
        .insert({
          user_id: ctx.userId,
          title: d.label,
          date: d.date,
          start_time: "09:00",
          end_time: "09:30",
          type: "personal",
          notes: `From document "${nameById.get(d.document_id) ?? "a document"}".`,
          linked_document_id: d.document_id,
          timezone: ctx.timezone,
          ai_generated: true,
        })
        .select("id")
        .single();
      if (eventError || !event) {
        failures.push(`"${d.label}": ${eventError?.message ?? "unknown error"}`);
        continue;
      }
      await ctx.supabase.from("document_dates").update({ added_to_calendar_event_id: event.id }).eq("id", d.id);
      await ctx.supabase.from("document_activity").insert({ user_id: ctx.userId, document_id: d.document_id, kind: "date_added_to_calendar", description: `Added "${d.label}" to calendar` });
      created.push(event);
    }
    if (created.length === 0) return { ok: false, error: failures.join("; ") };
    return { ok: true, result: { created: created.length, failures } };
  },
};

export const documentsCreateTasks: ToolSpec<{ documentTaskIds: string[] }> = {
  name: "documents_create_tasks",
  statusLabel: "Adding tasks…",
  description: "Propose turning one or more extracted document requirements into real tasks, bundled behind ONE confirmation. Requires exact documentTaskIds from documents_find_tasks or documents_read — never invent an id.",
  inputSchema: { type: "object", properties: { documentTaskIds: { type: "array", items: { type: "string" } } }, required: ["documentTaskIds"] },
  consequential: true,
  action: "create",
  describe: async (ctx, input) => {
    const { data, error } = await ctx.supabase.from("document_tasks").select("id,title").eq("user_id", ctx.userId).in("id", input.documentTaskIds);
    if (error) return { error: error.message };
    if (!data?.length) return { error: "I couldn't find those requirements." };
    return { summary: `Create ${data.length} task${data.length > 1 ? "s" : ""}: ${data.map((t: { title: string }) => `"${t.title}"`).join(", ")}?` };
  },
  execute: async (ctx, input) => {
    const { data: rows, error } = await ctx.supabase
      .from("document_tasks")
      .select("id,document_id,title,description")
      .eq("user_id", ctx.userId)
      .in("id", input.documentTaskIds);
    if (error) return { ok: false, error: error.message };
    if (!rows?.length) return { ok: false, error: "Those requirements no longer exist." };

    const created: unknown[] = [];
    const failures: string[] = [];
    for (const t of rows as { id: string; document_id: string; title: string; description: string }[]) {
      const { data: task, error: taskError } = await ctx.supabase
        .from("tasks")
        .insert({ user_id: ctx.userId, title: t.title, description: t.description || null, category: "personal", document_id: t.document_id, ai_context: "Created from a document's extracted requirements" })
        .select("id")
        .single();
      if (taskError || !task) {
        failures.push(`"${t.title}": ${taskError?.message ?? "unknown error"}`);
        continue;
      }
      await ctx.supabase.from("document_tasks").update({ created_task_id: task.id }).eq("id", t.id);
      await ctx.supabase.from("document_activity").insert({ user_id: ctx.userId, document_id: t.document_id, kind: "task_created", description: `Created task "${t.title}"` });
      created.push(task);
    }
    if (created.length === 0) return { ok: false, error: failures.join("; ") };
    return { ok: true, result: { created: created.length, failures } };
  },
};

export const documentsConnectGoal: ToolSpec<{ documentId: string; goalId: string }> = {
  name: "documents_connect_goal",
  statusLabel: "Connecting document to goal…",
  description: "Propose connecting a document to an existing goal. Requires exact documentId (documents_search) and goalId (goals_search).",
  inputSchema: { type: "object", properties: { documentId: { type: "string" }, goalId: { type: "string" } }, required: ["documentId", "goalId"] },
  consequential: true,
  action: "update",
  describe: async (ctx, input) => {
    const [{ data: doc }, { data: goal }] = await Promise.all([
      ctx.supabase.from("documents").select("name").eq("id", input.documentId).eq("user_id", ctx.userId).maybeSingle(),
      ctx.supabase.from("goals").select("name").eq("id", input.goalId).eq("user_id", ctx.userId).maybeSingle(),
    ]);
    if (!doc) return { error: "I couldn't find that document." };
    if (!goal) return { error: "I couldn't find that goal." };
    return { summary: `Connect "${doc.name}" to goal "${goal.name}"?` };
  },
  execute: async (ctx, input) => {
    const { error } = await ctx.supabase.from("documents").update({ linked_goal_id: input.goalId }).eq("id", input.documentId).eq("user_id", ctx.userId);
    if (error) return { ok: false, error: error.message };
    await ctx.supabase.from("document_activity").insert({ user_id: ctx.userId, document_id: input.documentId, kind: "connected_to_goal", description: "Connected to a goal via chat" });
    return { ok: true, result: { documentId: input.documentId, goalId: input.goalId } };
  },
};

export const documentTools = [
  documentsSearch,
  documentsRead,
  documentsDelete,
  documentsAsk,
  documentsAskAll,
  documentsFindDates,
  documentsFindTasks,
  documentsAddDatesToCalendar,
  documentsCreateTasks,
  documentsConnectGoal,
];
