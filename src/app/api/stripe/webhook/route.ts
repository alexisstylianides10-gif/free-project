import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { isStripeConfigured, stripeClient } from "@/lib/stripe/client";
import { planFromPriceId } from "@/lib/stripe/plans";
import { supabaseServiceRole } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Stripe moved the billing-cycle anchor off the subscription object and onto
// each subscription item as of the pinned API version — this app only ever
// has one item per subscription.
function currentPeriodEndOf(subscription: Stripe.Subscription): string | null {
  const seconds = subscription.items.data[0]?.current_period_end;
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) return NextResponse.json({ error: "Not configured." }, { status: 501 });
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return NextResponse.json({ error: "Webhook secret not configured." }, { status: 501 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature." }, { status: 400 });

  const rawBody = await req.text();
  const stripe = stripeClient();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const supabase = supabaseServiceRole();
  if (!supabase) {
    console.error(`[stripe webhook] SUPABASE_SERVICE_ROLE_KEY not configured — dropped event ${event.type}`);
    return NextResponse.json({ received: true });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id ?? session.metadata?.supabaseUserId;

      if (session.mode === "payment" && session.metadata?.kind === "credits") {
        const actions = Number(session.metadata.actions ?? 0);
        if (userId && actions > 0) {
          const { data: current } = await supabase.from("profiles").select("credits_balance").eq("id", userId).maybeSingle();
          const newBalance = (current?.credits_balance ?? 0) + actions;
          await supabase.from("profiles").update({ credits_balance: newBalance }).eq("id", userId);
        }
        break;
      }

      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      if (userId && subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price.id;
        const plan = priceId ? planFromPriceId(priceId) : null;
        if (plan) {
          const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
          await supabase
            .from("profiles")
            .update({
              plan,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              stripe_subscription_status: subscription.status,
              trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
              trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
              trial_status: subscription.status === "trialing" ? "active" : "converted",
              cancel_at_period_end: subscription.cancel_at_period_end,
              current_period_end: currentPeriodEndOf(subscription),
            })
            .eq("id", userId);
        }
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.supabaseUserId;
      if (userId) {
        const priceId = subscription.items.data[0]?.price.id;
        const plan = priceId ? planFromPriceId(priceId) : null;
        const { data: current } = await supabase.from("profiles").select("trial_status").eq("id", userId).maybeSingle();
        const patch: Record<string, unknown> = {
          stripe_subscription_status: subscription.status,
          cancel_at_period_end: subscription.cancel_at_period_end,
          current_period_end: currentPeriodEndOf(subscription),
        };
        // Only follow the subscription's plan while it's actually active/trialing —
        // a past_due or unpaid subscription shouldn't silently change what plan the
        // user is on; that's handled by the deletion event once Stripe gives up.
        if (plan && (subscription.status === "active" || subscription.status === "trialing")) patch.plan = plan;
        // The trial-to-paid conversion (day 3's real charge) shows up here as a
        // status transition, not a separate event — reflect it once, not every
        // subsequent update.
        if (subscription.status === "active" && current?.trial_status === "active") patch.trial_status = "converted";
        await supabase.from("profiles").update(patch).eq("id", userId);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.supabaseUserId;
      if (userId) {
        const { data: current } = await supabase.from("profiles").select("trial_status").eq("id", userId).maybeSingle();
        // A subscription that's deleted while still "active" trial_status means
        // it never converted (e.g. no payment method at trial's end) — vs. a
        // normal paid subscription reaching the end of a cancel-at-period-end
        // window, which is a real cancellation.
        const trialStatus = current?.trial_status === "active" ? "expired" : "canceled";
        await supabase
          .from("profiles")
          .update({ plan: "Free", stripe_subscription_status: "canceled", trial_status: trialStatus, cancel_at_period_end: false })
          .eq("id", userId);
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
