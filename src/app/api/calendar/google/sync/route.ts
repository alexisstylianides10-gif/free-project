import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { pullEventsFromGoogle } from "@/lib/google/calendar";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error: error ?? "Unauthorized." }, { status: 401 });

  try {
    const result = await pullEventsFromGoogle(client, user.id);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[google calendar] sync failed:", err);
    return NextResponse.json({ error: "Couldn't sync with Google Calendar just now." }, { status: 502 });
  }
}
