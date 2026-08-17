import type { ToolContext } from "./tools/types";
import { fetchOccurrencesOnDate } from "./eventOccurrences";

/**
 * Minimal, targeted context for the system prompt — counts and a short
 * upcoming list, not a dump of the user's database. Precise lookups happen
 * through tool calls (calendar_search, tasks_search, memory_list) on demand.
 */
export async function buildContextSummary(ctx: ToolContext): Promise<string> {
  const in7 = new Date(ctx.today + "T00:00:00");
  in7.setDate(in7.getDate() + 7);
  const in7ISO = in7.toISOString().slice(0, 10);
  const in3 = new Date(ctx.today + "T00:00:00");
  in3.setDate(in3.getDate() + 3);
  const in3ISO = in3.toISOString().slice(0, 10);

  const [
    todayEvents,
    { count: upcomingTaskCount },
    { count: memoryCount },
    { count: shoppingOpenCount },
    { count: goalsActiveCount },
    { count: routinesCount },
    { count: documentsCount },
    { data: attentionStatusDocs },
    { data: soonDocDates },
  ] = await Promise.all([
    fetchOccurrencesOnDate(ctx.supabase, ctx.userId, ctx.today).catch(() => []),
    ctx.supabase.from("tasks").select("id", { count: "exact", head: true }).eq("user_id", ctx.userId).eq("done", false).lte("due_date", in7ISO),
    ctx.supabase.from("memory").select("id", { count: "exact", head: true }).eq("user_id", ctx.userId).eq("active", true),
    ctx.supabase.from("shopping_items").select("id", { count: "exact", head: true }).eq("user_id", ctx.userId).eq("done", false),
    ctx.supabase.from("goals").select("id", { count: "exact", head: true }).eq("user_id", ctx.userId).eq("completed", false),
    ctx.supabase.from("routines").select("id", { count: "exact", head: true }).eq("user_id", ctx.userId),
    ctx.supabase.from("documents").select("id", { count: "exact", head: true }).eq("user_id", ctx.userId),
    ctx.supabase.from("documents").select("id").eq("user_id", ctx.userId).in("processing_status", ["error", "needs_review"]),
    ctx.supabase.from("document_dates").select("document_id").eq("user_id", ctx.userId).lte("date", in3ISO),
  ]);

  const eventsLine = todayEvents.length
    ? todayEvents.slice(0, 6).map((e) => `${e.startTime}-${e.endTime} ${e.title}`).join("; ")
    : "none";

  const documentsNeedsAttentionCount = new Set([
    ...(attentionStatusDocs ?? []).map((d: { id: string }) => d.id),
    ...(soonDocDates ?? []).map((d: { document_id: string }) => d.document_id),
  ]).size;

  const lines = [
    `Today is ${ctx.today} (user timezone: ${ctx.timezone}).`,
    `Today's events on the calendar: ${eventsLine}.`,
    `Tasks due within 7 days: ${upcomingTaskCount ?? 0}.`,
    `Active memories stored: ${memoryCount ?? 0}.`,
    `Open shopping items: ${shoppingOpenCount ?? 0}.`,
    `Active goals: ${goalsActiveCount ?? 0}.`,
    `Routines set up: ${routinesCount ?? 0}.`,
    `Documents stored: ${documentsCount ?? 0}${documentsNeedsAttentionCount ? ` (${documentsNeedsAttentionCount} need attention)` : ""}.`,
  ];

  // Only when this turn is inside a Business Coach chat (a conversation
  // tagged with a business_id) — one short line, not the business's full
  // knowledge base. Everything deeper is retrieved on demand via business_get.
  if (ctx.conversationId) {
    const { data: conversation } = await ctx.supabase.from("conversations").select("business_id").eq("id", ctx.conversationId).eq("user_id", ctx.userId).maybeSingle();
    if (conversation?.business_id) {
      const { data: business } = await ctx.supabase.from("businesses").select("name,stage").eq("id", conversation.business_id).eq("user_id", ctx.userId).maybeSingle();
      if (business) {
        lines.push(`This conversation is the Business Coach chat for "${business.name}" (stage: ${String(business.stage).replace(/_/g, " ")}, id: ${conversation.business_id}). Call business_get with this id for full detail before answering business questions.`);
      }
    }
  }

  return lines.join("\n");
}
