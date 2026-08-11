import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser, isBackendConfigured } from "@/lib/supabase/server";
import { getTool } from "@/lib/agent/tools/registry";
import { ToolError } from "@/lib/agent/tools/types";

export const dynamic = "force-dynamic";

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer (.+)$/i);
  return match ? match[1] : null;
}

interface PendingAction {
  tool: string;
  params: unknown;
  preview: string;
}

export async function POST(req: NextRequest) {
  if (!isBackendConfigured) {
    return NextResponse.json({ error: "Backend is not configured." }, { status: 503 });
  }

  const token = bearerToken(req);
  if (!token) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const authed = await getAuthedUser(token);
  if (!authed) return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });
  const { client: supabase, userId } = authed;

  let body: { messageId?: string; decision?: "confirm" | "cancel" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { messageId, decision } = body;
  if (!messageId || (decision !== "confirm" && decision !== "cancel")) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Never trust a client-supplied tool name or params — reload the pending
  // action from the message this server itself wrote earlier.
  const { data: msg, error: msgError } = await supabase
    .from("messages")
    .select("id, pending_action, conversation_id")
    .eq("id", messageId)
    .eq("user_id", userId)
    .single();
  if (msgError || !msg) {
    return NextResponse.json({ error: "That request no longer exists." }, { status: 404 });
  }
  const pending = msg.pending_action as PendingAction | null;
  if (!pending) {
    return NextResponse.json({ error: "That action was already resolved." }, { status: 409 });
  }

  const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", userId).single();
  const timezone = profile?.timezone || "UTC";

  if (decision === "cancel") {
    await supabase
      .from("messages")
      .update({ pending_action: null, resolved_action: { ...pending, decision: "cancelled" } })
      .eq("id", messageId);

    const { data: reply } = await supabase
      .from("messages")
      .insert({
        conversation_id: msg.conversation_id,
        user_id: userId,
        role: "assistant",
        content: "Okay, I won't do that.",
      })
      .select("id, created_at")
      .single();

    return NextResponse.json({ status: "cancelled", reply: "Okay, I won't do that.", messageId: reply?.id, createdAt: reply?.created_at });
  }

  const tool = getTool(pending.tool);
  if (!tool) {
    return NextResponse.json({ error: "That action is no longer available." }, { status: 400 });
  }
  const parsed = tool.paramsSchema.safeParse(pending.params);
  if (!parsed.success) {
    return NextResponse.json({ error: "That action's details look invalid now. Please try again." }, { status: 400 });
  }

  try {
    const result = await tool.execute(parsed.data, { supabase, userId, timezone, now: new Date() });

    await supabase
      .from("messages")
      .update({ pending_action: null, resolved_action: { ...pending, decision: "confirmed" } })
      .eq("id", messageId);

    await supabase.from("agent_actions").insert({
      user_id: userId,
      tool: tool.name,
      action: result.summary,
      status: "success",
      metadata: parsed.data as object,
      event_id: (result.data as { id?: string } | undefined)?.id ?? null,
    });

    const { data: reply } = await supabase
      .from("messages")
      .insert({
        conversation_id: msg.conversation_id,
        user_id: userId,
        role: "assistant",
        content: `Done. ${result.summary}`,
      })
      .select("id, created_at")
      .single();

    return NextResponse.json({ status: "confirmed", reply: `Done. ${result.summary}`, messageId: reply?.id, createdAt: reply?.created_at });
  } catch (err) {
    const message = err instanceof ToolError ? err.message : "That action failed. Please try again.";

    await supabase
      .from("messages")
      .update({ pending_action: null, resolved_action: { ...pending, decision: "failed" } })
      .eq("id", messageId);

    await supabase.from("agent_actions").insert({
      user_id: userId,
      tool: tool.name,
      action: message,
      status: "failed",
      metadata: parsed.data as object,
    });

    const { data: reply } = await supabase
      .from("messages")
      .insert({ conversation_id: msg.conversation_id, user_id: userId, role: "assistant", content: message })
      .select("id, created_at")
      .single();

    return NextResponse.json(
      { status: "failed", reply: message, messageId: reply?.id, createdAt: reply?.created_at },
      { status: 200 }
    );
  }
}
