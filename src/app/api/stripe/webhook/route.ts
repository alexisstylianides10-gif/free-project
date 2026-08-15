import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { isStripeConfigured, stripeClient } from "@/lib/stripe/client";
import { planFromPriceId } from "@/lib/stripe/plans";
import { supabaseServiceRole } from "@/lib/supabase/server";

export const runtime = "nodejs";

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
      const userId = session.client_reference_id;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      if (userId && subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price.id;
        const plan = priceId ? planFromPriceId(priceId) : null;
        if (plan) {
          const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
          await supabase
            .from("profiles")
            .update({ plan, stripe_customer_id: customerId, stripe_subscription_id: subscriptionId, stripe_subscription_status: subscription.status })
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
        const patch: Record<string, unknown> = { stripe_subscription_status: subscription.status };
        // Only follow the subscription's plan while it's actually active/trialing —
        // a past_due or unpaid subscription shouldn't silently change what plan the
        // user is on; that's handled by the deletion event once Stripe gives up.
        if (plan && (subscription.status === "active" || subscription.status === "trialing")) patch.plan = plan;
        await supabase.from("profiles").update(patch).eq("id", userId);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.supabaseUserId;
      if (userId) {
        await supabase.from("profiles").update({ plan: "Free", stripe_subscription_status: "canceled" }).eq("id", userId);
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
