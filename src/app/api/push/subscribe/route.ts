import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";

interface SubscribeBody {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
}

export async function POST(req: NextRequest) {
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error }, { status: 401 });

  let body: SubscribeBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: "Missing subscription fields." }, { status: 400 });
  }

  const { error: upsertError } = await client
    .from("push_subscriptions")
    .upsert(
      { user_id: user.id, endpoint: body.endpoint, p256dh: body.keys.p256dh, auth_key: body.keys.auth },
      { onConflict: "endpoint" }
    );
  if (upsertError) return NextResponse.json({ error: "Couldn't save that subscription." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
