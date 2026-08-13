import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface SubscribeBody {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function POST(req: NextRequest) {
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error: error ?? "Unauthorized." }, { status: 401 });

  let body: SubscribeBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: "Missing subscription fields." }, { status: 400 });
  }

  const { error: upsertError } = await client.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      user_agent: req.headers.get("user-agent") ?? null,
    },
    { onConflict: "endpoint" }
  );
  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error: error ?? "Unauthorized." }, { status: 401 });

  let body: { endpoint: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.endpoint) return NextResponse.json({ error: "Missing endpoint." }, { status: 400 });

  const { error: deleteError } = await client.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", body.endpoint);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
