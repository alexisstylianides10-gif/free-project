import { formatDayLabel, formatTime12, timeOverlap } from "@/lib/utils";
import { pushEventToGoogle } from "@/lib/google/calendar";
import { fetchOccurrencesInRange, fetchOccurrencesOnDate } from "@/lib/ai/eventOccurrences";
import type { ToolSpec } from "./types";
import type { ToolContext } from "./types";

const EVENT_TYPES = ["school", "health", "social", "study", "work", "personal", "travel"] as const;

interface EventRow {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  type: string;
  location: string | null;
  notes: string | null;
  timezone?: string;
  recurrence?: "none" | "daily" | "weekly";
  source?: "alxioum" | "google";
  google_event_id?: string | null;
}

function eventLabel(e: EventRow, today: string): string {
  const loc = e.location ? ` @ ${e.location}` : "";
  return `"${e.title}" — ${formatDayLabel(e.date, today)} ${formatTime12(e.start_time)}–${formatTime12(e.end_time)}${loc} (id: ${e.id})`;
}

/** Fire-and-forget push of an AI-driven calendar change out to the user's connected Google Calendar, if any. */
function syncToGoogle(ctx: ToolContext, action: "create" | "update" | "delete", row: EventRow) {
  pushEventToGoogle(ctx.supabase, ctx.userId, action, {
    id: row.id,
    title: row.title,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    location: row.location ?? undefined,
    notes: row.notes ?? undefined,
    timezone: row.timezone ?? ctx.timezone,
    recurrence: row.recurrence ?? "none",
    source: row.source ?? "alxioum",
    googleEventId: row.google_event_id ?? undefined,
  }).catch((err) => console.error("[google calendar] AI push failed:", err));
}

export const calendarSearch: ToolSpec<{ query?: string; from?: string; to?: string; limit?: number }> = {
  name: "calendar_search",
  statusLabel: "Checking your calendar…",
  description:
    "Search the user's calendar events by free-text query and/or date range. ALWAYS call this before calendar_update or calendar_delete to resolve which event(s) the user means — never guess an event id. Returns each match's id, which you must use for update/delete.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Free-text match against title/location/notes, e.g. 'dentist'." },
      from: { type: "string", description: "ISO date, inclusive lower bound." },
      to: { type: "string", description: "ISO date, inclusive upper bound." },
      limit: { type: "number", description: "Max results, default 15." },
    },
  },
  consequential: false,
  execute: async (ctx, input) => {
    const limit = input.limit ?? 15;

    // A bounded date range needs recurrence expansion — a plain literal-date
    // query would miss a recurring event whose seed date falls outside
    // [from, to] but which still occurs within it (e.g. "what's on my
    // calendar next Tuesday" for a weekly class that started months ago).
    if (input.from && input.to) {
      try {
        const occurrences = await fetchOccurrencesInRange(ctx.supabase, ctx.userId, input.from, input.to);
        const q = input.query?.toLowerCase();
        const filtered = q
          ? occurrences.filter((e) => e.title.toLowerCase().includes(q) || (e.location ?? "").toLowerCase().includes(q) || (e.notes ?? "").toLowerCase().includes(q))
          : occurrences;
        const rows = filtered.slice(0, limit);
        return {
          ok: true,
          result: {
            count: rows.length,
            events: rows.map((e) => ({ id: e.id, title: e.title, date: e.date, startTime: e.startTime, endTime: e.endTime, type: e.type, location: e.location })),
          },
        };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "Couldn't load your calendar just now." };
      }
    }

    let q = ctx.supabase.from("events").select("*").eq("user_id", ctx.userId);
    if (input.from) q = q.gte("date", input.from);
    if (input.to) q = q.lte("date", input.to);
    if (input.query) q = q.or(`title.ilike.%${input.query}%,location.ilike.%${input.query}%,notes.ilike.%${input.query}%`);
    q = q.order("date", { ascending: true }).order("start_time", { ascending: true }).limit(limit);
    const { data, error } = await q;
    if (error) return { ok: false, error: error.message };
    const rows = data as EventRow[];
    return {
      ok: true,
      result: {
        count: rows.length,
        events: rows.map((e) => ({ id: e.id, title: e.title, date: e.date, startTime: e.start_time, endTime: e.end_time, type: e.type, location: e.location })),
      },
    };
  },
};

export const calendarCreate: ToolSpec<{
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  type?: (typeof EVENT_TYPES)[number];
  location?: string;
  notes?: string;
  recurrence?: "none" | "daily" | "weekly";
  recurrenceUntil?: string;
}> = {
  name: "calendar_create",
  statusLabel: "Adding to your calendar…",
  description: "Propose creating a new calendar event. Requires an explicit title, date (ISO), start time and end time (HH:mm, 24h) — ask the user for anything missing rather than guessing.",
  inputSchema: {
    type: "object",
    properties: {
      title: { type: "string" },
      date: { type: "string", description: "ISO date, e.g. 2026-08-14" },
      startTime: { type: "string", description: "HH:mm 24h" },
      endTime: { type: "string", description: "HH:mm 24h" },
      type: { type: "string", enum: EVENT_TYPES as unknown as string[] },
      location: { type: "string" },
      notes: { type: "string" },
      recurrence: { type: "string", enum: ["none", "daily", "weekly"] },
      recurrenceUntil: { type: "string", description: "ISO date the recurrence ends, required if recurrence is not 'none'." },
    },
    required: ["title", "date", "startTime", "endTime"],
  },
  consequential: true,
  action: "create",
  describe: async (ctx, input) => {
    if (input.endTime <= input.startTime) return { error: "End time must be after start time." };
    let conflict: { title: string; startTime: string; endTime: string } | undefined;
    try {
      const occurrences = await fetchOccurrencesOnDate(ctx.supabase, ctx.userId, input.date);
      conflict = occurrences.find((e) => timeOverlap(input.startTime, input.endTime, e.startTime, e.endTime));
    } catch {
      // Conflict detection is best-effort — a lookup failure shouldn't block proposing the event.
    }
    const when = `${formatDayLabel(input.date, ctx.today)}, ${formatTime12(input.startTime)}–${formatTime12(input.endTime)}`;
    const conflictNote = conflict ? `\n\n⚠️ This overlaps with "${conflict.title}" (${formatTime12(conflict.startTime)}–${formatTime12(conflict.endTime)}).` : "";
    return { summary: `Create "${input.title}" — ${when}${input.location ? ` at ${input.location}` : ""}?${conflictNote}` };
  },
  execute: async (ctx, input) => {
    const { data, error } = await ctx.supabase
      .from("events")
      .insert({
        user_id: ctx.userId,
        title: input.title,
        date: input.date,
        start_time: input.startTime,
        end_time: input.endTime,
        type: input.type ?? "personal",
        location: input.location ?? null,
        notes: input.notes ?? null,
        recurrence: input.recurrence ?? "none",
        recurrence_until: input.recurrenceUntil ?? null,
        timezone: ctx.timezone,
        ai_generated: true,
      })
      .select("*")
      .single();
    if (error) return { ok: false, error: error.message };
    syncToGoogle(ctx, "create", data as EventRow);
    return { ok: true, result: { event: data } };
  },
};

export const calendarUpdate: ToolSpec<{
  eventId: string;
  title?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  notes?: string;
}> = {
  name: "calendar_update",
  statusLabel: "Updating your calendar…",
  description: "Propose updating an existing calendar event (e.g. moving its time). Requires the exact eventId from calendar_search — never invent one.",
  inputSchema: {
    type: "object",
    properties: {
      eventId: { type: "string" },
      title: { type: "string" },
      date: { type: "string" },
      startTime: { type: "string" },
      endTime: { type: "string" },
      location: { type: "string" },
      notes: { type: "string" },
    },
    required: ["eventId"],
  },
  consequential: true,
  action: "update",
  describe: async (ctx, input) => {
    const { data, error } = await ctx.supabase.from("events").select("*").eq("id", input.eventId).eq("user_id", ctx.userId).maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: "I couldn't find that event — it may have already been deleted." };
    const before = eventLabel(data as EventRow, ctx.today);
    const after = { ...(data as EventRow), title: input.title ?? data.title, date: input.date ?? data.date, start_time: input.startTime ?? data.start_time, end_time: input.endTime ?? data.end_time, location: input.location ?? data.location };
    const afterLabel = eventLabel(after as EventRow, ctx.today);
    return { summary: `Update ${before}\n→ ${afterLabel.replace(/ \(id: .+\)$/, "")}?` };
  },
  execute: async (ctx, input) => {
    const row: Record<string, unknown> = {};
    if (input.title !== undefined) row.title = input.title;
    if (input.date !== undefined) row.date = input.date;
    if (input.startTime !== undefined) row.start_time = input.startTime;
    if (input.endTime !== undefined) row.end_time = input.endTime;
    if (input.location !== undefined) row.location = input.location;
    if (input.notes !== undefined) row.notes = input.notes;
    const { data, error } = await ctx.supabase.from("events").update(row).eq("id", input.eventId).eq("user_id", ctx.userId).select("*").maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: "Event no longer exists." };
    syncToGoogle(ctx, "update", data as EventRow);
    return { ok: true, result: { event: data } };
  },
};

export const calendarDelete: ToolSpec<{ eventId: string }> = {
  name: "calendar_delete",
  statusLabel: "Updating your calendar…",
  description: "Propose deleting a calendar event. Requires the exact eventId from calendar_search. There is no bulk-delete tool — each event must be deleted individually and confirmed individually.",
  inputSchema: { type: "object", properties: { eventId: { type: "string" } }, required: ["eventId"] },
  consequential: true,
  action: "delete",
  describe: async (ctx, input) => {
    const { data, error } = await ctx.supabase.from("events").select("*").eq("id", input.eventId).eq("user_id", ctx.userId).maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: "I couldn't find that event — it may have already been deleted." };
    return { summary: `Delete ${eventLabel(data as EventRow, ctx.today)}?` };
  },
  execute: async (ctx, input) => {
    const { data, error } = await ctx.supabase.from("events").delete().eq("id", input.eventId).eq("user_id", ctx.userId).select("*").maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: "Event no longer exists." };
    syncToGoogle(ctx, "delete", data as EventRow);
    return { ok: true, result: { deleted: { id: data.id, title: data.title } } };
  },
};

export const calendarTools = [calendarSearch, calendarCreate, calendarUpdate, calendarDelete];
