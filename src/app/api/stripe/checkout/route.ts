import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, supabaseServiceRole } from "@/lib/supabase/server";
import { isStripeConfigured, stripeClient } from "@/lib/stripe/client";
import { isPaidPlan, stripePriceId, stripeCreditsPriceId, type BillingCycle } from "@/lib/stripe/plans";
import { CREDIT_PACKS } from "@/lib/billing/plans";

const checkoutBodySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("subscription"), plan: z.string().min(1), cycle: z.enum(["monthly", "yearly"]) }),
  z.object({ kind: z.literal("credits"), packId: z.string().min(1) }),
]);

export const runtime = "nodejs";

type CheckoutBody = { kind: "subscription"; plan: string; cycle: BillingCycle } | { kind: "credits"; packId: string };

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) return NextResponse.json({ error: "Billing isn't set up yet." }, { status: 501 });
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error: error ?? "Unauthorized." }, { status: 401 });

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = checkoutBodySchema.safeParse(rawBody);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  const body: CheckoutBody = parsed.data;

  const stripe = stripeClient();
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

  const { data: profile, error: profileError } = await client.from("profiles").select("email, name, stripe_customer_id, trial_status").eq("id", user.id).maybeSingle();
  if (profileError || !profile) return NextResponse.json({ error: "Couldn't load your profile." }, { status: 500 });

  let customerId = profile.stripe_customer_id as string | null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile.email || user.email || undefined,
      name: profile.name || undefined,
      metadata: { supabaseUserId: user.id },
    });
    customerId = customer.id;
    // profiles.stripe_customer_id is locked to service-role writes only (see
    // the column-privilege migration) — the user's own JWT-scoped client
    // can no longer write it, so this uses the service-role client instead,
    // safe here because we've already verified the user's identity above.
    const serviceRole = supabaseServiceRole();
    if (serviceRole) await serviceRole.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  if (body.kind === "credits") {
    const pack = CREDIT_PACKS.find((p) => p.id === body.packId);
    if (!pack) return NextResponse.json({ error: "Unknown credit pack." }, { status: 400 });
    const priceId = stripeCreditsPriceId(pack.id);
    if (!priceId) return NextResponse.json({ error: "That top-up isn't available for purchase yet." }, { status: 501 });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      metadata: { supabaseUserId: user.id, kind: "credits", packId: pack.id, actions: String(pack.actions) },
      success_url: `${site}/app/settings?billing=success`,
      cancel_url: `${site}/app/settings?billing=cancelled`,
    });
    if (!session.url) return NextResponse.json({ error: "Couldn't start checkout." }, { status: 502 });
    return NextResponse.json({ url: session.url });
  }

  if (!isPaidPlan(body.plan) || (body.cycle !== "monthly" && body.cycle !== "yearly")) {
    return NextResponse.json({ error: "Invalid plan or billing cycle." }, { status: 400 });
  }
  const priceId = stripePriceId(body.plan, body.cycle);
  if (!priceId) return NextResponse.json({ error: "That plan isn't available for purchase yet." }, { status: 501 });

  // A 3-day trial, once per customer — real apps don't let the same person
  // reset their trial by re-subscribing after it ends/converts/gets canceled.
  const eligibleForTrial = (profile.trial_status ?? "none") === "none";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: user.id,
    // Checkout collects a real payment method upfront for subscription mode
    // regardless of trial — this makes that explicit rather than relying on
    // the default, and cancels automatically if Stripe ever ends up without
    // one instead of silently granting free access.
    payment_method_collection: "always",
    subscription_data: {
      metadata: { supabaseUserId: user.id, plan: body.plan },
      ...(eligibleForTrial
        ? { trial_period_days: 3, trial_settings: { end_behavior: { missing_payment_method: "cancel" } } }
        : {}),
    },
    success_url: `${site}/app/settings?billing=success`,
    cancel_url: `${site}/app/settings?billing=cancelled`,
  });

  if (!session.url) return NextResponse.json({ error: "Couldn't start checkout." }, { status: 502 });
  return NextResponse.json({ url: session.url });
}
