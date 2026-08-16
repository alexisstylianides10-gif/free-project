import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/ai/rateLimit";
import { analyzeAndStoreDocument } from "@/lib/documents/uploadCore";
import type { ResponseCard } from "@/lib/ai/cards";

export const runtime = "nodejs";

/**
 * Chat's "attach a document" action — runs the exact same Storage + AI
 * analysis pipeline as the Documents tab's own upload (analyzeAndStoreDocument),
 * so a file attached in chat genuinely becomes a Documents row (spec §26),
 * not a chat-only ephemeral preview. Persists a real assistant turn in the
 * conversation with a document card, same as any other chat response.
 */
export async function POST(req: NextRequest) {
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error: error ?? "Unauthorized." }, { status: 401 });

  if (isRateLimited(user.id)) {
    return NextResponse.json({ error: "Give it a moment before attaching another file." }, { status: 429 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }
  const file = formData.get("file");
  const conversationId = formData.get("conversationId");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided." }, { status: 400 });
  if (typeof conversationId !== "string" || !conversationId) return NextResponse.json({ error: "Missing conversationId." }, { status: 400 });

  const { data: conversation, error: convError } = await client.from("conversations").select("id").eq("id", conversationId).eq("user_id", user.id).maybeSingle();
  if (convError) return NextResponse.json({ error: convError.message }, { status: 500 });
  if (!conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });

  const outcome = await analyzeAndStoreDocument(client, user.id, file);
  if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: outcome.status });

  const doc = outcome.document as { id: string; name: string; mimeType: string; summary: string; suggestedCategory?: string };
  const dates = outcome.dates as { label: string; date: string }[];
  const tasks = outcome.tasks as { title: string }[];
  const nearestDeadline = dates.length ? dates.reduce((earliest, d) => (!earliest || d.date < earliest.date ? d : earliest), null as { label: string; date: string } | null) : null;

  const card: ResponseCard = {
    type: "document",
    documents: [{ id: doc.id, name: doc.name, mimeType: doc.mimeType, summary: doc.summary, category: doc.suggestedCategory ?? null, nearestDeadline }],
  };

  const parts = [`I've analyzed "${doc.name}".`];
  if (dates.length) parts.push(`Found ${dates.length} date${dates.length > 1 ? "s" : ""}.`);
  if (tasks.length) parts.push(`Found ${tasks.length} task${tasks.length > 1 ? "s" : ""}.`);
  const content = parts.join(" ");

  const { data: assistantRow, error: assistantError } = await client
    .from("messages")
    .insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: "assistant",
      content,
      tool_calls: [],
      response_cards: [card],
    })
    .select("*")
    .single();
  if (assistantError) return NextResponse.json({ error: assistantError.message }, { status: 500 });

  await client.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);

  return NextResponse.json({
    assistantMessage: {
      id: assistantRow.id,
      conversationId,
      role: "assistant",
      content: assistantRow.content,
      toolCalls: [],
      pendingAction: null,
      resolvedAction: null,
      cards: assistantRow.response_cards ?? [],
      createdAt: assistantRow.created_at,
    },
  });
}
