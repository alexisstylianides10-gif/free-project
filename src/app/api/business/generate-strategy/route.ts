import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/ai/rateLimit";
import { generateMarketingIdeas } from "@/lib/business/strategy";

export const runtime = "nodejs";

/**
 * Thin wrapper around the shared generateMarketingIdeas helper (also used
 * directly by the business_generate_strategy Head Agent tool) so the
 * Content tab's "[Generate Draft]" button can trigger the same
 * grounded-in-real-data idea generation without going through chat.
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

  const outcome = await generateMarketingIdeas(client, user.id, body.businessId);
  if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: 502 });

  const rows = outcome.ideas.map((i) => ({ user_id: user.id, business_id: body.businessId, idea: i.idea, platform: `${i.category}: ${i.platform}` }));
  const { data: inserted, error: insertError } = rows.length ? await client.from("business_content").insert(rows).select("*") : { data: [], error: null };
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  await client.from("business_activity").insert({ user_id: user.id, business_id: body.businessId, kind: "strategy_generated", description: `Generated ${outcome.ideas.length} marketing ideas` });

  return NextResponse.json({ content: inserted });
}
