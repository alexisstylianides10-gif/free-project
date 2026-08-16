import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { getWeeklyReview } from "@/lib/business/weeklyReview";

export const runtime = "nodejs";

/**
 * Thin wrapper around the shared getWeeklyReview helper (also used directly
 * by the business_weekly_review_get Head Agent tool) so the dashboard's
 * "Weekly Review" section can show the same real, deterministic 7-day
 * aggregation without going through chat.
 */
export async function POST(req: NextRequest) {
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error: error ?? "Unauthorized." }, { status: 401 });

  let body: { businessId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.businessId) return NextResponse.json({ error: "Missing businessId." }, { status: 400 });

  const outcome = await getWeeklyReview(client, user.id, body.businessId);
  if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: 404 });
  return NextResponse.json({ review: outcome.review });
}
