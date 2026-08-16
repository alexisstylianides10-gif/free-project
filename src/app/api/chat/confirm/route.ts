import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { getTool } from "@/lib/ai/tools";
import { todayISOInTimezone } from "@/lib/utils";

export const runtime = "nodejs";

interface ConfirmBody {
  pendingActionId: string;
  decision: "confirm" | "cancel";
}

export async function POST(req: NextRequest) {
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error: error ?? "Unauthorized." }, { status: 401 });

  let body: ConfirmBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.pendingActionId || (body.decision !== "confirm" && body.decision !== "cancel")) {
    return NextResponse.json({ error: "Missing pendingActionId or decision." }, { status: 400 });
  }

  const { data: pending, error: fetchError } = await client
    .from("pending_actions")
    .select("*")
    .eq("id", body.pendingActionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!pending) return NextResponse.json({ error: "That action wasn't found." }, { status: 404 });

  if (pending.status !== "pending") {
    return NextResponse.json({ error: `This action was already ${pending.status}.` }, { status: 409 });
  }
  if (new Date(pending.expires_at) < new Date()) {
    await client.from("pending_actions").update({ status: "expired" }).eq("id", pending.id);
    return NextResponse.json({ error: "This action expired. Ask Alxioum again if you still want to do it." }, { status: 409 });
  }

  const { data: profileRow } = await client.from("profiles").select("timezone").eq("id", user.id).maybeSingle();
  const timezone = profileRow?.timezone || "UTC";

  if (body.decision === "cancel") {
    await client.from("pending_actions").update({ status: "cancelled", resolved_at: new Date().toISOString() }).eq("id", pending.id);
    await client.from("agent_actions").insert({ user_id: user.id, tool: pending.tool, action: pending.action, status: "CANCELLED", metadata: { summary: pending.summary } });
    const resolvedAction = { id: pending.id, tool: pending.tool, action: pending.action, summary: pending.summary, args: pending.args, status: "cancelled", resultSummary: "Cancelled — no changes made." };
    if (pending.message_id) await client.from("messages").update({ resolved_action: resolvedAction }).eq("id", pending.message_id);
    return NextResponse.json({ resolvedAction });
  }

  const spec = getTool(pending.tool);
  if (!spec) {
    return NextResponse.json({ error: `Unknown tool "${pending.tool}".` }, { status: 500 });
  }

  const result = await spec.execute({ supabase: client, userId: user.id, timezone, today: todayISOInTimezone(timezone) }, pending.args);

  await client
    .from("pending_actions")
    .update({ status: "confirmed", resolved_at: new Date().toISOString() })
    .eq("id", pending.id);

  await client.from("agent_actions").insert({
    user_id: user.id,
    tool: pending.tool,
    action: pending.action,
    status: result.ok ? "SUCCESS" : "FAILED",
    metadata: result.ok ? { summary: pending.summary, result: result.result } : { summary: pending.summary, error: result.error },
  });

  const partialFailures = result.ok ? extractPartialFailures(result.result) : null;
  const resultSummary = !result.ok
    ? `Couldn't complete this: ${result.error}`
    : partialFailures?.length
      ? `Done — but ${partialFailures.length} part${partialFailures.length > 1 ? "s" : ""} of it failed: ${partialFailures.join("; ")}`
      : deterministicSuccessLine(pending.action, pending.summary);
  const resolvedAction = {
    id: pending.id,
    tool: pending.tool,
    action: pending.action,
    summary: pending.summary,
    args: pending.args,
    status: result.ok ? "confirmed" : "failed",
    resultSummary,
  };
  if (pending.message_id) await client.from("messages").update({ resolved_action: resolvedAction }).eq("id", pending.message_id);

  return NextResponse.json({ resolvedAction, ok: result.ok });
}

/** A tool's execute() can succeed overall while reporting some sub-items failed (e.g. plan_organize_day creating 3 of 4 things) — surface that instead of a blanket "Done." */
function extractPartialFailures(result: unknown): string[] | null {
  if (!result || typeof result !== "object") return null;
  const failures = (result as { failures?: unknown }).failures;
  return Array.isArray(failures) && failures.every((f) => typeof f === "string") ? failures : null;
}

function deterministicSuccessLine(action: string, summary: string): string {
  const clean = summary.replace(/\?$/, "").replace(/^(Create|Update|Delete|Remember|Forget|Mark)\s+/, (m) => m.trim());
  switch (action) {
    case "create":
      return `Done — created it.`;
    case "update":
      return `Done — updated.`;
    case "delete":
      return `Done — deleted.`;
    case "complete":
      return `Done — marked complete.`;
    default:
      return `Done: ${clean}.`;
  }
}
