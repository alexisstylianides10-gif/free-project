import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error }, { status: 401 });

  let body: { endpoint?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.endpoint) return NextResponse.json({ error: "Missing endpoint." }, { status: 400 });

  await client.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", body.endpoint);
  return NextResponse.json({ ok: true });
}
