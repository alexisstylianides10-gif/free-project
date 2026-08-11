import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser, isBackendConfigured } from "@/lib/supabase/server";
import { runHeadAgent } from "@/lib/agent/headAgent";
import { checkPlanUsage, type Plan } from "@/lib/agent/plan";

export const dynamic = "force-dynamic";

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer (.+)$/i);
  return match ? match[1] : null;
}

const HISTORY_LIMIT = 20;

export async function POST(req: NextRequest) {
  if (!isBackendConfigured) {
    return NextResponse.json({ error: "Backend is not configured." }, { status: 503 });
  }

  const token = bearerToken(req);
  if (!token) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const authed = await getAuthedUser(token);
  if (!authed) return NextResponse.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });
  const { client: supabase, userId } = authed;

  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const message = (body.message ?? "").trim();
  if (!message) return NextResponse.json({ error: "Message can't be empty." }, { status: 400 });
  if (message.length > 4000) return NextResponse.json({ error: "That message is too long." }, { status: 400 });

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("plan, timezone")
    .eq("id", userId)
    .single();
  if (profileError || !profile) {
    return NextResponse.json({ error: "Couldn't load your account. Please try again." }, { status: 500 });
  }
  const plan = profile.plan as Plan;
  const timezone = profile.timezone || "UTC";

  const usage = await checkPlanUsage(supabase, userId, plan);
  if (!usage.allowed) {
    return NextResponse.json({
      reply: `You've used all ${usage.limit} AI actions on the Free plan this month. Upgrade to Pro in Settings for unlimited access — it resets on the 1st either way.`,
      pendingAction: null,
    });
  }

  let { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conversation) {
    const { data: created, error: createError } = await supabase
      .from("conversations")
      .insert({ user_id: userId })
      .select("id")
      .single();
    if (createError || !created) {
      return NextResponse.json({ error: "Couldn't start a conversation. Please try again." }, { status: 500 });
    }
    conversation = created;
  }

  const { data: historyRows } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  const history = (historyRows ?? [])
    .reverse()
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const { data: userMsgRow, error: userMsgError } = await supabase
    .from("messages")
    .insert({ conversation_id: conversation.id, user_id: userId, role: "user", content: message })
    .select("id")
    .single();
  if (userMsgError || !userMsgRow) {
    return NextResponse.json({ error: "Couldn't save your message. Please try again." }, { status: 500 });
  }

  const result = await runHeadAgent({
    history,
    userMessage: message,
    ctx: { supabase, userId, timezone, now: new Date() },
  });

  const { data: assistantMsgRow, error: assistantMsgError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversation.id,
      user_id: userId,
      role: "assistant",
      content: result.reply,
      pending_action: result.pendingAction ?? null,
    })
    .select("id, created_at")
    .single();
  if (assistantMsgError || !assistantMsgRow) {
    return NextResponse.json({ error: "Couldn't save the reply. Please try again." }, { status: 500 });
  }

  await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversation.id);

  return NextResponse.json({
    conversationId: conversation.id,
    messageId: assistantMsgRow.id,
    reply: result.reply,
    pendingAction: result.pendingAction ?? null,
    createdAt: assistantMsgRow.created_at,
  });
}
