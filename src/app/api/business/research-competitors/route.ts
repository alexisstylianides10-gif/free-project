import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/ai/rateLimit";
import { researchCompetitors } from "@/lib/business/competitors";

export const runtime = "nodejs";

/**
 * Thin wrapper around the shared researchCompetitors helper (also used
 * directly by the business_research_competitors Head Agent tool) so the
 * Competitors tab's "[Investigate]" button can trigger the same real,
 * honest-by-construction research without going through chat.
 */
export async function POST(req: NextRequest) {
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error: error ?? "Unauthorized." }, { status: 401 });

  if (isRateLimited(user.id)) {
    return NextResponse.json({ error: "Give it a moment before trying again." }, { status: 429 });
  }

  let body: { businessId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.businessId) return NextResponse.json({ error: "Missing businessId." }, { status: 400 });

  const outcome = await researchCompetitors(client, user.id, body.businessId);
  if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: 502 });
  if (!outcome.available) return NextResponse.json({ available: false });

  const rows = outcome.competitors.map((c) => ({
    user_id: user.id,
    business_id: body.businessId,
    name: c.name,
    product: c.product,
    target_customer: c.targetCustomer,
    pricing: c.pricing,
    strengths: c.strengths,
    weaknesses: c.weaknesses,
    positioning: c.positioning,
    source: "ai_research" as const,
  }));
  const { data: inserted, error: insertError } = await client.from("business_competitors").insert(rows).select("*");
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  await client.from("business_activity").insert({ user_id: user.id, business_id: body.businessId, kind: "competitors_researched", description: `Found ${outcome.competitors.length} competitors` });

  return NextResponse.json({ available: true, competitors: inserted, opportunityNote: outcome.opportunityNote });
}
