import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/ai/rateLimit";
import { breakdownTask } from "@/lib/tasks/breakdown";

export const runtime = "nodejs";

/**
 * Proposal only — mirrors /api/goals/decompose, doesn't write anything.
 * The UI shows the proposed subtasks for review; a separate direct update
 * (via db.ts, once the user confirms) writes them to tasks.subtasks.
 */
export async function POST(req: NextRequest) {
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error: error ?? "Unauthorized." }, { status: 401 });

  if (isRateLimited(user.id)) {
    return NextResponse.json({ error: "Give it a moment before trying again." }, { status: 429 });
  }

  let body: { taskId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.taskId) return NextResponse.json({ error: "Missing taskId." }, { status: 400 });

  const { data: task } = await client.from("tasks").select("title,description").eq("id", body.taskId).eq("user_id", user.id).maybeSingle();
  if (!task) return NextResponse.json({ error: "That task wasn't found." }, { status: 404 });

  const outcome = await breakdownTask(task.title, task.description ?? undefined);
  if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: 502 });

  return NextResponse.json({ subtasks: outcome.subtasks });
}
