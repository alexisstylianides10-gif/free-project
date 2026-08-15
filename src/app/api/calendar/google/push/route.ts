import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { pushEventToGoogle } from "@/lib/google/calendar";
import type { CalendarEvent } from "@/lib/types";

export const runtime = "nodejs";

interface PushBody {
  action: "create" | "update" | "delete";
  event: Pick<CalendarEvent, "id" | "title" | "date" | "startTime" | "endTime" | "location" | "notes" | "timezone" | "recurrence" | "source" | "googleEventId">;
}

// Called by the Calendar UI right after it creates/updates/deletes an
// Alxioum-native event, so the change reaches the user's connected Google
// Calendar too. Google tokens never leave the server, so this has to be a
// dedicated round-trip rather than the client calling Google directly.
export async function POST(req: NextRequest) {
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error: error ?? "Unauthorized." }, { status: 401 });

  let body: PushBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.event?.id || !body.action) return NextResponse.json({ error: "Missing event or action." }, { status: 400 });

  await pushEventToGoogle(client, user.id, body.action, body.event);
  return NextResponse.json({ ok: true });
}
