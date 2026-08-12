import { z } from "zod";
import type { ToolDefinition } from "./types";
import { ToolError } from "./types";

const isoDatetime = z.string().refine((v) => !isNaN(Date.parse(v)), "must be a valid ISO 8601 datetime");

function fmt(dt: string, timezone: string) {
  return new Date(dt).toLocaleString("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function fmtRange(start: string, end: string, timezone: string) {
  const s = new Date(start);
  const e = new Date(end);
  const sameDay = s.toDateString() === e.toDateString();
  const dateLabel = s.toLocaleString("en-US", { timeZone: timezone, weekday: "long", month: "short", day: "numeric" });
  const startLabel = s.toLocaleString("en-US", { timeZone: timezone, hour: "numeric", minute: "2-digit" });
  const endLabel = sameDay
    ? e.toLocaleString("en-US", { timeZone: timezone, hour: "numeric", minute: "2-digit" })
    : e.toLocaleString("en-US", { timeZone: timezone, weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  return `${dateLabel}, ${startLabel}–${endLabel}`;
}

// ---------------------------------------------------------------------------
// calendar_create_event
// ---------------------------------------------------------------------------
const createEventParams = z.object({
  title: z.string().min(1).max(200),
  start_time: isoDatetime,
  end_time: isoDatetime,
  notes: z.string().max(2000).optional(),
});
type CreateEventParams = z.infer<typeof createEventParams>;

export const createEventTool: ToolDefinition<CreateEventParams> = {
  name: "calendar_create_event",
  description:
    "Create a new calendar event. Resolve any relative dates/times (e.g. 'next Tuesday at 3pm') to absolute ISO 8601 datetimes yourself before calling this, using the current date provided in context.",
  inputSchema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Short event title, e.g. 'Dentist appointment'." },
      start_time: { type: "string", description: "ISO 8601 datetime, e.g. 2026-08-18T15:00:00." },
      end_time: { type: "string", description: "ISO 8601 datetime. Default to 1 hour after start if the user gave no duration." },
      notes: { type: "string", description: "Optional free-text notes." },
    },
    required: ["title", "start_time", "end_time"],
  },
  paramsSchema: createEventParams,
  requiresConfirmation: true,
  preview: (p, ctx) => `Create "${p.title}" — ${fmtRange(p.start_time, p.end_time, ctx.timezone)}`,
  execute: async (p, ctx) => {
    if (new Date(p.end_time) <= new Date(p.start_time)) {
      throw new ToolError("The end time has to be after the start time.", "invalid_input");
    }
    const { data, error } = await ctx.supabase
      .from("calendar_events")
      .insert({ user_id: ctx.userId, title: p.title, start_time: p.start_time, end_time: p.end_time, notes: p.notes ?? null })
      .select()
      .single();
    if (error) throw new ToolError(`Couldn't create the event: ${error.message}`, "db_error");
    return { summary: `Created "${p.title}" — ${fmtRange(p.start_time, p.end_time, ctx.timezone)}`, data };
  },
};

// ---------------------------------------------------------------------------
// calendar_get_events
// ---------------------------------------------------------------------------
const getEventsParams = z.object({
  from: isoDatetime.optional(),
  to: isoDatetime.optional(),
  search_title: z.string().max(200).optional(),
});
type GetEventsParams = z.infer<typeof getEventsParams>;

export const getEventsTool: ToolDefinition<GetEventsParams> = {
  name: "calendar_get_events",
  description:
    "Read the user's calendar for a date range (inclusive). Resolve relative ranges ('this week', 'tomorrow') to absolute ISO 8601 datetimes yourself. Also usable to search for an event by title. Read-only — never requires confirmation.",
  inputSchema: {
    type: "object",
    properties: {
      from: { type: "string", description: "ISO 8601 datetime, start of range. Defaults to now." },
      to: { type: "string", description: "ISO 8601 datetime, end of range. Defaults to 7 days after 'from'." },
      search_title: { type: "string", description: "Optional text to filter events by title." },
    },
  },
  paramsSchema: getEventsParams,
  requiresConfirmation: false,
  execute: async (p, ctx) => {
    const from = p.from ?? ctx.now.toISOString();
    const to = p.to ?? new Date(new Date(from).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    let query = ctx.supabase
      .from("calendar_events")
      .select("id, title, start_time, end_time, notes")
      .gte("start_time", from)
      .lte("start_time", to)
      .order("start_time", { ascending: true });

    if (p.search_title) query = query.ilike("title", `%${p.search_title}%`);

    const { data, error } = await query;
    if (error) throw new ToolError(`Couldn't read the calendar: ${error.message}`, "db_error");

    const events = data ?? [];
    const contextForModel =
      events.length === 0
        ? "No events found in that range."
        : events
            .map((e) => `- [${e.id}] ${e.title}: ${fmtRange(e.start_time, e.end_time, ctx.timezone)}${e.notes ? ` (notes: ${e.notes})` : ""}`)
            .join("\n");

    return { summary: `Found ${events.length} event(s).`, data: events, contextForModel };
  },
};

// ---------------------------------------------------------------------------
// shared: resolve a target event from either an explicit id or a title search
// ---------------------------------------------------------------------------
async function resolveOneEvent(ctx: Parameters<ToolDefinition["execute"]>[1], eventId?: string, searchTitle?: string) {
  if (eventId) {
    const { data, error } = await ctx.supabase.from("calendar_events").select("*").eq("id", eventId).eq("user_id", ctx.userId).maybeSingle();
    if (error) throw new ToolError(`Couldn't look up that event: ${error.message}`, "db_error");
    if (!data) throw new ToolError("I couldn't find that calendar event anymore — it may have already been deleted.", "not_found");
    return data;
  }
  if (!searchTitle) throw new ToolError("I need either an event ID or a title to search for.", "invalid_input");

  const { data, error } = await ctx.supabase
    .from("calendar_events")
    .select("*")
    .ilike("title", `%${searchTitle}%`)
    .order("start_time", { ascending: true });
  if (error) throw new ToolError(`Couldn't search the calendar: ${error.message}`, "db_error");

  if (!data || data.length === 0) {
    throw new ToolError(`I couldn't find a calendar event matching "${searchTitle}".`, "not_found");
  }
  if (data.length > 1) {
    const list = data.map((e) => `"${e.title}" on ${fmt(e.start_time, ctx.timezone)}`).join(", ");
    throw new ToolError(`I found ${data.length} events matching "${searchTitle}": ${list}. Which one did you mean?`, "ambiguous");
  }
  return data[0];
}

// ---------------------------------------------------------------------------
// calendar_update_event
// ---------------------------------------------------------------------------
const updateEventParams = z
  .object({
    event_id: z.string().uuid().optional(),
    search_title: z.string().max(200).optional(),
    title: z.string().min(1).max(200).optional(),
    start_time: isoDatetime.optional(),
    end_time: isoDatetime.optional(),
    notes: z.string().max(2000).optional(),
  })
  .refine((p) => p.event_id || p.search_title, { message: "event_id or search_title is required" });
type UpdateEventParams = z.infer<typeof updateEventParams>;

export const updateEventTool: ToolDefinition<UpdateEventParams> = {
  name: "calendar_update_event",
  description:
    "Update an existing event's title, time, or notes. Identify the event with event_id if you already have it (e.g. from a prior get_events call), otherwise with search_title. Only include the fields that are actually changing.",
  inputSchema: {
    type: "object",
    properties: {
      event_id: { type: "string", description: "Exact event UUID, if already known." },
      search_title: { type: "string", description: "Text to find the event by title, if the ID isn't known." },
      title: { type: "string", description: "New title, if changing." },
      start_time: { type: "string", description: "New ISO 8601 start time, if changing." },
      end_time: { type: "string", description: "New ISO 8601 end time, if changing." },
      notes: { type: "string", description: "New notes, if changing." },
    },
  },
  paramsSchema: updateEventParams,
  requiresConfirmation: true,
  preview: async (p, ctx) => {
    const changes: string[] = [];
    if (p.title) changes.push(`title → "${p.title}"`);
    if (p.start_time && p.end_time) changes.push(`time → ${fmtRange(p.start_time, p.end_time, ctx.timezone)}`);
    else if (p.start_time) changes.push(`start → ${fmt(p.start_time, ctx.timezone)}`);
    else if (p.end_time) changes.push(`end → ${fmt(p.end_time, ctx.timezone)}`);
    if (p.notes !== undefined) changes.push("notes updated");

    let target = p.title ?? p.search_title;
    if (!target && p.event_id) {
      const existing = await resolveOneEvent(ctx, p.event_id, undefined).catch(() => null);
      target = existing?.title ?? "event";
    }
    return `Update "${target ?? "event"}": ${changes.join(", ") || "no changes specified"}`;
  },
  execute: async (p, ctx) => {
    const existing = await resolveOneEvent(ctx, p.event_id, p.search_title);

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (p.title) patch.title = p.title;
    if (p.start_time) patch.start_time = p.start_time;
    if (p.end_time) patch.end_time = p.end_time;
    if (p.notes !== undefined) patch.notes = p.notes;

    const nextStart = (patch.start_time as string) ?? existing.start_time;
    const nextEnd = (patch.end_time as string) ?? existing.end_time;
    if (new Date(nextEnd) <= new Date(nextStart)) {
      throw new ToolError("The end time has to be after the start time.", "invalid_input");
    }

    const { data, error } = await ctx.supabase.from("calendar_events").update(patch).eq("id", existing.id).eq("user_id", ctx.userId).select().single();
    if (error) throw new ToolError(`Couldn't update the event: ${error.message}`, "db_error");

    return { summary: `Updated "${existing.title}" → ${fmtRange(nextStart, nextEnd, ctx.timezone)}`, data };
  },
};

// ---------------------------------------------------------------------------
// calendar_delete_event
// ---------------------------------------------------------------------------
const deleteEventParams = z
  .object({
    event_id: z.string().uuid().optional(),
    search_title: z.string().max(200).optional(),
  })
  .refine((p) => p.event_id || p.search_title, { message: "event_id or search_title is required" });
type DeleteEventParams = z.infer<typeof deleteEventParams>;

export const deleteEventTool: ToolDefinition<DeleteEventParams> = {
  name: "calendar_delete_event",
  description: "Delete an event. Identify it with event_id if known, otherwise search_title.",
  inputSchema: {
    type: "object",
    properties: {
      event_id: { type: "string", description: "Exact event UUID, if already known." },
      search_title: { type: "string", description: "Text to find the event by title, if the ID isn't known." },
    },
  },
  paramsSchema: deleteEventParams,
  requiresConfirmation: true,
  preview: async (p, ctx) => {
    if (p.search_title) return `Delete "${p.search_title}"`;
    const existing = await resolveOneEvent(ctx, p.event_id, undefined).catch(() => null);
    return `Delete "${existing?.title ?? "event"}"${existing ? ` — ${fmt(existing.start_time, ctx.timezone)}` : ""}`;
  },
  execute: async (p, ctx) => {
    const existing = await resolveOneEvent(ctx, p.event_id, p.search_title);
    const { error } = await ctx.supabase.from("calendar_events").delete().eq("id", existing.id).eq("user_id", ctx.userId);
    if (error) throw new ToolError(`Couldn't delete the event: ${error.message}`, "db_error");
    return { summary: `Deleted "${existing.title}" — ${fmt(existing.start_time, ctx.timezone)}`, data: existing };
  },
};
