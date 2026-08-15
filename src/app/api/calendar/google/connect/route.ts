import { NextRequest, NextResponse } from "next/server";
import { requireUserFromToken } from "@/lib/supabase/server";
import { buildAuthUrl, isGoogleCalendarConfigured } from "@/lib/google/calendar";

export const runtime = "nodejs";

// A plain top-level navigation (window.location.href), not a fetch — Google's
// consent screen redirect can't carry our Authorization header, so the
// client passes its access token as a query param and we thread it through
// to Google as the OAuth `state`, to be read back on the callback.
export async function GET(req: NextRequest) {
  if (!isGoogleCalendarConfigured()) {
    return NextResponse.json({ error: "Google Calendar isn't configured on the server yet." }, { status: 501 });
  }
  const token = req.nextUrl.searchParams.get("token");
  const { user, error } = await requireUserFromToken(token);
  if (!user) return NextResponse.json({ error: error ?? "Unauthorized." }, { status: 401 });

  return NextResponse.redirect(buildAuthUrl(token!));
}
