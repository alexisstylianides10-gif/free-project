import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { ClaudeProvider } from "@/lib/ai/claudeProvider";
import { runHeadAgent } from "@/lib/ai/headAgent";
import { isRateLimited } from "@/lib/ai/rateLimit";
import { planLimits } from "@/lib/billing/plans";
import type { Plan } from "@/lib/types";
import { todayISO } from "@/lib/utils";

export const runtime = "nodejs";

const provider = new ClaudeProvider();

interface ChatRequestBody {
  conversationId: string;
  message: string;
}

export async function POST(req: NextRequest) {
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error: error ?? "Unauthorized." }, { status: 401 });

  if (isRateLimited(user.id)) {
    return NextResponse.json({ error: "You're sending messages too quickly. Wait a moment and try again." }, { status: 429 });
  }

  let body: ChatRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const text = (body.message ?? "").trim();
  const conversationId = body.conversationId;
  if (!text || !conversationId) return NextResponse.json({ error: "Missing message or conversationId." }, { status: 400 });
  if (text.length > 4000) return NextResponse.json({ error: "That message is too long." }, { status: 400 });

  const { data: conversation, error: convError } = await client
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (convError) return NextResponse.json({ error: convError.message }, { status: 500 });
  if (!conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });

  const { data: profileRow, error: profileError } = await client
    .from("profiles")
    .select("plan, timezone, ai_messages_used, ai_tokens_used, usage_period_start")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || !profileRow) return NextResponse.json({ error: "Could not load your profile." }, { status: 500 });

  const plan = planLimits((profileRow.plan as Plan) ?? "Free");
  const timezone = profileRow.timezone || "UTC";
  const today = todayISO();

  const periodStart = new Date(profileRow.usage_period_start as string);
  const now = new Date();
  const periodExpired = periodStart.getUTCFullYear() !== now.getUTCFullYear() || periodStart.getUTCMonth() !== now.getUTCMonth();
  const messagesUsed = periodExpired ? 0 : (profileRow.ai_messages_used as number);

  if (messagesUsed >= plan.aiMessagesPerMonth) {
    return NextResponse.json(
      {
        error: `You've used all ${plan.aiMessagesPerMonth} AI actions included in your ${plan.name} plan this month. Upgrade in Settings for a higher limit, or it resets next month.`,
        code: "USAGE_LIMIT_REACHED",
      },
      { status: 402 }
    );
  }

  const { data: userMsgRow, error: userMsgError } = await client
    .from("messages")
    .insert({ conversation_id: conversationId, user_id: user.id, role: "user", content: text })
    .select("*")
    .single();
  if (userMsgError) return NextResponse.json({ error: userMsgError.message }, { status: 500 });

  const { data: historyRows } = await client
    .from("messages")
    .select("id, role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(plan.contextConversationTurns * 2 + 1);

  const history = (historyRows ?? [])
    .reverse()
    .filter((m) => m.id !== userMsgRow.id)
    .slice(-(plan.contextConversationTurns * 2))
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content as string }));

  let agentResult;
  try {
    agentResult = await runHeadAgent({
      provider,
      ctx: { supabase: client, userId: user.id, timezone, today },
      history,
      userText: text,
      maxTokens: plan.maxOutputTokensPerReply,
    });
  } catch (err) {
    console.error("[headAgent] failed:", err);
    return NextResponse.json({ error: "Alxioum couldn't process that just now. Please try again." }, { status: 502 });
  }

  let pendingActionCard = null as null | { id: string; tool: string; action: string; summary: string; args: Record<string, unknown>; status: string };

  if (agentResult.proposedAction) {
    const { data: pendingRow, error: pendingError } = await client
      .from("pending_actions")
      .insert({
        user_id: user.id,
        conversation_id: conversationId,
        tool: agentResult.proposedAction.tool,
        action: agentResult.proposedAction.action,
        args: agentResult.proposedAction.args,
        summary: agentResult.proposedAction.summary,
        status: "pending",
      })
      .select("*")
      .single();
    if (pendingError) {
      console.error("[pending_actions] insert failed:", pendingError);
    } else {
      pendingActionCard = {
        id: pendingRow.id,
        tool: pendingRow.tool,
        action: pendingRow.action,
        summary: pendingRow.summary,
        args: pendingRow.args,
        status: pendingRow.status,
      };
    }
  }

  const totalTokens = agentResult.usage.inputTokens + agentResult.usage.outputTokens;

  const { data: assistantRow, error: assistantError } = await client
    .from("messages")
    .insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: "assistant",
      content: agentResult.content,
      tool_calls: agentResult.toolCalls,
      pending_action: pendingActionCard,
      tokens_used: totalTokens,
    })
    .select("*")
    .single();
  if (assistantError) return NextResponse.json({ error: assistantError.message }, { status: 500 });

  if (pendingActionCard) {
    await client.from("pending_actions").update({ message_id: assistantRow.id }).eq("id", pendingActionCard.id);
  }

  await client
    .from("profiles")
    .update({
      ai_messages_used: messagesUsed + 1,
      ai_tokens_used: periodExpired ? totalTokens : (profileRow.ai_tokens_used as number) + totalTokens,
      usage_period_start: periodExpired ? today : profileRow.usage_period_start,
    })
    .eq("id", user.id);

  await client.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);

  return NextResponse.json({
    userMessage: { id: userMsgRow.id, conversationId, role: "user", content: text, toolCalls: [], pendingAction: null, resolvedAction: null, createdAt: userMsgRow.created_at },
    assistantMessage: {
      id: assistantRow.id,
      conversationId,
      role: "assistant",
      content: assistantRow.content,
      toolCalls: assistantRow.tool_calls,
      pendingAction: assistantRow.pending_action,
      resolvedAction: assistantRow.resolved_action,
      createdAt: assistantRow.created_at,
    },
  });
}
