import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { requireUser, supabaseServiceRole } from "@/lib/supabase/server";
import { stripeClient } from "@/lib/billing/stripe";
import { getPlanOption, type BillingInterval } from "@/lib/billing/plans";

export const runtime = "nodejs";

/**
 * Starts (or resumes) a subscription for the caller's track (student or
 * business — fixed at /choose-plan, before onboarding). Reuses the caller's
 * Stripe customer if one already exists; otherwise creates one and writes
 * it back via the service-role client, since profiles.stripe_customer_id is
 * not client-writable (see the column-grant lockdown in the billing
 * migration).
 */
export async function POST(req: NextRequest) {
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error }, { status: 401 });

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Billing isn't configured yet." }, { status: 503 });
  }

  let body: { interval?: BillingInterval };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const interval = body.interval === "yearly" ? "yearly" : "monthly";

  const { data: profile } = await client
    .from("profiles")
    .select("stripe_customer_id, track")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

  const planOption = getPlanOption(profile.track, interval);
  const priceId = process.env[planOption.envVar];
  if (!priceId) {
    return NextResponse.json({ error: "This plan isn't configured yet." }, { status: 503 });
  }

  let customerId = profile?.stripe_customer_id as string | null | undefined;

  try {
    const stripe = stripeClient();

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      const serviceClient = supabaseServiceRole();
      if (serviceClient) {
        await serviceClient.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
      }
    }

    const origin = req.nextUrl.origin;
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { supabase_user_id: user.id, track: profile.track, interval },
      success_url: `${origin}/app/upgrade?checkout=success`,
      cancel_url: `${origin}/app/upgrade?checkout=cancel`,
    });

    if (!session.url) throw new Error("Stripe didn't return a Checkout URL.");
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't start checkout.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
