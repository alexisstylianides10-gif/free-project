import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push/webpush";

/**
 * Sends a push to the CALLER'S OWN devices only — there is no userId in the
 * request body, `requireUser` resolves it from the caller's own session.
 * Used right after achievement/roadmap-level-up events (which already run
 * client-side with the user's own Supabase client) so a real push follows
 * the in-app notification-bell row without needing a service-role route.
 */
export async function POST(req: NextRequest) {
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error }, { status: 401 });

  let body: { title?: string; body?: string; href?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.title || !body.body) return NextResponse.json({ error: "Missing title/body." }, { status: 400 });

  await sendPushToUser(client, user.id, { title: body.title, body: body.body, href: body.href });
  return NextResponse.json({ ok: true });
}
