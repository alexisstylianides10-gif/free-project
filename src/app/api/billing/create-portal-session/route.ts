import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { stripeClient } from "@/lib/billing/stripe";

export const runtime = "nodejs";

/** Lets an already-subscribed student manage or cancel their Alxioum Plus
 * subscription via Stripe's hosted Billing Portal. */
export async function POST(req: NextRequest) {
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error }, { status: 401 });

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Billing isn't configured yet." }, { status: 503 });
  }

  const { data: profile } = await client.from("profiles").select("stripe_customer_id").eq("id", user.id).maybeSingle();
  const customerId = profile?.stripe_customer_id as string | null | undefined;
  if (!customerId) {
    return NextResponse.json({ error: "No subscription found for this account." }, { status: 404 });
  }

  try {
    const session = await stripeClient().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${req.nextUrl.origin}/app/profile`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't open the billing portal.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
