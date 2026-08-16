import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { getTool } from "@/lib/ai/tools";
import { UNDO_MAP } from "@/lib/ai/undoMap";
import { todayISOInTimezone } from "@/lib/utils";
import type { ResolvedActionCard } from "@/lib/types";

export const runtime = "nodejs";

interface UndoBody {
  messageId: string;
}

/**
 * Reverses a create-type consequential action by calling its matching
 * delete tool directly — no LLM round-trip, same pattern as
 * /api/chat/confirm. Only tools with a defined inverse in undoMap.ts can
 * be undone; everything else 400s rather than pretending to succeed.
 */
export async function POST(req: NextRequest) {
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error: error ?? "Unauthorized." }, { status: 401 });

  let body: UndoBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.messageId) return NextResponse.json({ error: "Missing messageId." }, { status: 400 });

  const { data: messageRow, error: fetchError } = await client
    .from("messages")
    .select("id, user_id, resolved_action")
    .eq("id", body.messageId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!messageRow) return NextResponse.json({ error: "That message wasn't found." }, { status: 404 });

  const resolved = messageRow.resolved_action as ResolvedActionCard | null;
  if (!resolved || resolved.status !== "confirmed") return NextResponse.json({ error: "There's nothing to undo here." }, { status: 409 });
  if (resolved.undone) return NextResponse.json({ error: "This was already undone." }, { status: 409 });

  const mapping = UNDO_MAP[resolved.tool];
  if (!mapping) return NextResponse.json({ error: "This action can't be undone." }, { status: 400 });

  const deleteArgsList = mapping.extractDeleteArgs(resolved.result);
  if (deleteArgsList.length === 0) return NextResponse.json({ error: "Couldn't find what to undo." }, { status: 409 });

  const deleteSpec = getTool(mapping.deleteTool);
  if (!deleteSpec) return NextResponse.json({ error: "This action can't be undone." }, { status: 500 });

  const { data: profileRow } = await client.from("profiles").select("timezone").eq("id", user.id).maybeSingle();
  const timezone = profileRow?.timezone || "UTC";
  const ctx = { supabase: client, userId: user.id, timezone, today: todayISOInTimezone(timezone) };

  let succeeded = 0;
  const failures: string[] = [];
  for (const deleteArgs of deleteArgsList) {
    const result = await deleteSpec.execute(ctx, deleteArgs);
    if (result.ok) succeeded++;
    else failures.push(result.error);
  }

  if (succeeded === 0) {
    return NextResponse.json({ error: failures.length ? failures.join("; ") : "Couldn't undo that." }, { status: 502 });
  }

  await client.from("agent_actions").insert({
    user_id: user.id,
    tool: mapping.deleteTool,
    action: "delete",
    status: "success",
    metadata: { undoOf: resolved.tool, messageId: body.messageId },
  });

  const updatedResolved: ResolvedActionCard = {
    ...resolved,
    undone: true,
    resultSummary: failures.length ? `${resolved.resultSummary} (Undone — but ${failures.length} part${failures.length > 1 ? "s" : ""} couldn't be removed.)` : `${resolved.resultSummary} (Undone.)`,
  };
  await client.from("messages").update({ resolved_action: updatedResolved }).eq("id", body.messageId);

  return NextResponse.json({ resolvedAction: updatedResolved });
}
