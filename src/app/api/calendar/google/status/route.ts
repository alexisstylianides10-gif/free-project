import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { getConnectionStatus, isGoogleCalendarConfigured } from "@/lib/google/calendar";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error: error ?? "Unauthorized." }, { status: 401 });

  const status = await getConnectionStatus(client, user.id);
  return NextResponse.json({ ...status, configured: isGoogleCalendarConfigured() });
}
