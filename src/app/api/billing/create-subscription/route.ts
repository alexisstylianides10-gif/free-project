import "server-only";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
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
 *
 * Unlike a hosted Checkout Session, this creates the subscription directly
 * in `incomplete` status and hands back its first invoice's PaymentIntent
 * client secret — the caller's own CheckoutForm confirms it in place with
 * Stripe's Payment Element, so the customer never leaves the app. The
 * webhook (customer.subscription.updated) is what actually flips
 * plan/plan_status once that confirmation succeeds.
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
    .select("stripe_customer_id, stripe_subscription_id, track")
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
    const serviceClient = supabaseServiceRole();

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      if (serviceClient) {
        await serviceClient.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
      }
    }

    // A previous attempt may have left an incomplete subscription behind
    // (e.g. the customer closed the tab before paying) — cancel it so the
    // customer isn't left with two subscriptions once this one activates.
    const previousSubscriptionId = profile.stripe_subscription_id as string | null | undefined;
    if (previousSubscriptionId) {
      const previous = await stripe.subscriptions.retrieve(previousSubscriptionId).catch(() => null);
      if (previous && previous.status === "incomplete") {
        await stripe.subscriptions.cancel(previousSubscriptionId).catch(() => undefined);
      }
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription", payment_method_types: ["card"] },
      expand: ["latest_invoice.confirmation_secret"],
      metadata: { supabase_user_id: user.id, track: profile.track, interval },
    });

    if (serviceClient) {
      await serviceClient.from("profiles").update({ stripe_subscription_id: subscription.id }).eq("id", user.id);
    }

    // Invoices no longer carry a `payment_intent` field directly (recent
    // Stripe API versions) — the PaymentIntent's client secret for
    // confirming payment now lives on the invoice's `confirmation_secret`.
    const invoice = subscription.latest_invoice as Stripe.Invoice | null;
    const clientSecret = invoice?.confirmation_secret?.client_secret;
    if (!clientSecret) throw new Error("Stripe didn't return a payment client secret.");

    return NextResponse.json({ clientSecret });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't start checkout.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
