import { NextRequest } from "next/server";
import { requireUser, supabaseServiceRole } from "@/lib/supabase/server";
import { ClaudeProvider } from "@/lib/ai/claudeProvider";
import { runHeadAgent } from "@/lib/ai/headAgent";
import { isRateLimited } from "@/lib/ai/rateLimit";
import { planLimits } from "@/lib/billing/plans";
import type { Plan } from "@/lib/types";
import { todayISOInTimezone } from "@/lib/utils";
import type { SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const provider = new ClaudeProvider();

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];
const MAX_IMAGE_BASE64_LENGTH = 6_000_000; // ~4.5MB raw

interface ChatRequestBody {
  conversationId: string;
  message: string;
  image?: { base64: string; mediaType: string };
}

function jsonError(error: string, status: number, code?: string) {
  return new Response(JSON.stringify({ error, code }), { status, headers: { "Content-Type": "application/json" } });
}

export async function POST(req: NextRequest) {
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return jsonError(error ?? "Unauthorized.", 401);

  if (isRateLimited(user.id)) {
    return jsonError("You're sending messages too quickly. Wait a moment and try again.", 429);
  }

  let body: ChatRequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const text = (body.message ?? "").trim();
  const conversationId = body.conversationId;
  if (!conversationId) return jsonError("Missing conversationId.", 400);
  if (text.length > 4000) return jsonError("That message is too long.", 400);

  let image: { mediaType: AllowedImageType; data: string } | undefined;
  if (body.image) {
    if (!ALLOWED_IMAGE_TYPES.includes(body.image.mediaType as AllowedImageType)) {
      return jsonError("Unsupported image type.", 400);
    }
    if (!body.image.base64 || body.image.base64.length > MAX_IMAGE_BASE64_LENGTH) {
      return jsonError("That image is too large.", 400);
    }
    image = { mediaType: body.image.mediaType as AllowedImageType, data: body.image.base64 };
  }

  if (!text && !image) return jsonError("Missing message or image.", 400);

  const { data: conversation, error: convError } = await client
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (convError) return jsonError(convError.message, 500);
  if (!conversation) return jsonError("Conversation not found.", 404);

  const { data: profileRow, error: profileError } = await client
    .from("profiles")
    .select("plan, timezone, ai_messages_used, ai_tokens_used, usage_period_start, credits_balance")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || !profileRow) return jsonError("Could not load your profile.", 500);

  const plan = planLimits((profileRow.plan as Plan) ?? "Free");
  const timezone = profileRow.timezone || "UTC";
  const today = todayISOInTimezone(timezone);

  const periodStart = new Date(profileRow.usage_period_start as string);
  const now = new Date();
  const periodExpired = periodStart.getUTCFullYear() !== now.getUTCFullYear() || periodStart.getUTCMonth() !== now.getUTCMonth();
  const messagesUsed = periodExpired ? 0 : (profileRow.ai_messages_used as number);
  const creditsBalance = (profileRow.credits_balance as number) ?? 0;
  const withinPlanAllowance = messagesUsed < plan.aiMessagesPerMonth;

  if (!withinPlanAllowance && creditsBalance <= 0) {
    return jsonError(
      `You've used all ${plan.aiMessagesPerMonth} AI actions included in your ${plan.name} plan this month. Buy more actions or upgrade in Settings, or it resets next month.`,
      402,
      "USAGE_LIMIT_REACHED"
    );
  }
  // This message either fits inside the plan's monthly allowance, or (if
  // that's exhausted) spends one purchased credit instead.
  const usingCredit = !withinPlanAllowance;

  const storedText = text || "📷 Photo";
  const { data: userMsgRow, error: userMsgError } = await client
    .from("messages")
    .insert({ conversation_id: conversationId, user_id: user.id, role: "user", content: storedText })
    .select("*")
    .single();
  if (userMsgError) return jsonError(userMsgError.message, 500);

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

  const userMessage = { id: userMsgRow.id, conversationId, role: "user", content: storedText, toolCalls: [], pendingAction: null, resolvedAction: null, createdAt: userMsgRow.created_at };

  // Streamed as newline-delimited JSON: zero or more {type:"status", label}
  // events while the agent works (up to 4 tool-call rounds can each take a
  // moment), then exactly one terminal {type:"done", ...} or {type:"error", ...}.
  // Not token-by-token prose streaming — the final answer still arrives whole,
  // this only replaces the empty wait with real signal about what's happening.
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      function send(event: Record<string, unknown>) {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      }

      try {
        const agentResult = await runHeadAgent({
          provider,
          ctx: { supabase: client as SupabaseClient, userId: user.id, timezone, today, conversationId },
          history,
          userText: text,
          image,
          maxTokens: plan.maxOutputTokensPerReply,
          onStatus: (label) => send({ type: "status", label }),
        });

        let pendingActionCard = null as null | { id: string; tool: string; action: string; summary: string; args: Record<string, unknown>; status: string };

        if (agentResult.proposedAction) {
          // A correction to a still-unconfirmed proposal ("actually Saturday")
          // supersedes it rather than leaving two live-looking cards — the old
          // one collapses, the new one is the one the user actually confirms.
          const { data: stalePending } = await client.from("pending_actions").select("id, message_id, tool, action, summary, args").eq("conversation_id", conversationId).eq("status", "pending");
          if (stalePending?.length) {
            const staleIds = stalePending.map((p) => p.id);
            await client.from("pending_actions").update({ status: "superseded", resolved_at: new Date().toISOString() }).in("id", staleIds);
            for (const stale of stalePending) {
              if (!stale.message_id) continue;
              const supersededAction = {
                id: stale.id,
                tool: stale.tool,
                action: stale.action,
                summary: stale.summary,
                args: stale.args,
                status: "superseded",
                resultSummary: "Updated below.",
              };
              await client.from("messages").update({ resolved_action: supersededAction }).eq("id", stale.message_id);
            }
          }

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
            response_cards: agentResult.cards.length ? agentResult.cards : null,
            tokens_used: totalTokens,
          })
          .select("*")
          .single();
        if (assistantError) {
          send({ type: "error", error: assistantError.message });
          controller.close();
          return;
        }

        if (pendingActionCard) {
          await client.from("pending_actions").update({ message_id: assistantRow.id }).eq("id", pendingActionCard.id);
        }

        // Usage/credit columns are locked to service-role writes only — see
        // the profiles column-privilege migration.
        const serviceRole = supabaseServiceRole();
        if (serviceRole) {
          await serviceRole
            .from("profiles")
            .update({
              ai_messages_used: messagesUsed + 1,
              ai_tokens_used: periodExpired ? totalTokens : (profileRow.ai_tokens_used as number) + totalTokens,
              usage_period_start: periodExpired ? today : profileRow.usage_period_start,
              credits_balance: usingCredit ? creditsBalance - 1 : creditsBalance,
            })
            .eq("id", user.id);
        }

        await client.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);

        send({
          type: "done",
          userMessage,
          assistantMessage: {
            id: assistantRow.id,
            conversationId,
            role: "assistant",
            content: assistantRow.content,
            toolCalls: assistantRow.tool_calls,
            pendingAction: assistantRow.pending_action,
            resolvedAction: assistantRow.resolved_action,
            cards: assistantRow.response_cards ?? [],
            choices: agentResult.choices,
            createdAt: assistantRow.created_at,
          },
        });
      } catch (err) {
        console.error("[headAgent] failed:", err);
        send({ type: "error", error: "Alxioum couldn't process that just now. Please try again." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" } });
}
