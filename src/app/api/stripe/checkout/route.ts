import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { isStripeConfigured, stripeClient } from "@/lib/stripe/client";
import { isPaidPlan, stripePriceId, type BillingCycle } from "@/lib/stripe/plans";

export const runtime = "nodejs";

interface CheckoutBody {
  plan: string;
  cycle: BillingCycle;
}

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) return NextResponse.json({ error: "Billing isn't set up yet." }, { status: 501 });
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error: error ?? "Unauthorized." }, { status: 401 });

  let body: CheckoutBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!isPaidPlan(body.plan) || (body.cycle !== "monthly" && body.cycle !== "yearly")) {
    return NextResponse.json({ error: "Invalid plan or billing cycle." }, { status: 400 });
  }

  const priceId = stripePriceId(body.plan, body.cycle);
  if (!priceId) return NextResponse.json({ error: "That plan isn't available for purchase yet." }, { status: 501 });

  const { data: profile, error: profileError } = await client.from("profiles").select("email, name, stripe_customer_id").eq("id", user.id).maybeSingle();
  if (profileError || !profile) return NextResponse.json({ error: "Couldn't load your profile." }, { status: 500 });

  const stripe = stripeClient();
  let customerId = profile.stripe_customer_id as string | null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile.email || user.email || undefined,
      name: profile.name || undefined,
      metadata: { supabaseUserId: user.id },
    });
    customerId = customer.id;
    await client.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: user.id,
    subscription_data: { metadata: { supabaseUserId: user.id, plan: body.plan } },
    success_url: `${site}/app/settings?billing=success`,
    cancel_url: `${site}/app/settings?billing=cancelled`,
  });

  if (!session.url) return NextResponse.json({ error: "Couldn't start checkout." }, { status: 502 });
  return NextResponse.json({ url: session.url });
}
