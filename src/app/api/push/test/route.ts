import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push/send";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error: error ?? "Unauthorized." }, { status: 401 });

  const { data: subs } = await client.from("push_subscriptions").select("id").eq("user_id", user.id);
  if (!subs || subs.length === 0) {
    return NextResponse.json({ error: "No devices are subscribed to notifications yet." }, { status: 400 });
  }

  try {
    const result = await sendPushToUser(client, user.id, {
      title: "Alxioum",
      body: "Notifications are working — this is what a real alert looks like.",
      url: "/app/today",
    });
    if (result.sent === 0) return NextResponse.json({ error: "Couldn't deliver to any subscribed device." }, { status: 502 });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to send." }, { status: 500 });
  }
}
