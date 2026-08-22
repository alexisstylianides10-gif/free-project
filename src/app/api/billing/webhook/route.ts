import "server-only";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServiceRole } from "@/lib/supabase/server";
import { stripeClient } from "@/lib/billing/stripe";

export const runtime = "nodejs";

/**
 * Stripe calls this directly — there is no Supabase user session on the
 * request, so the caller is authenticated by verifying Stripe's signature
 * instead of requireUser(), and every write goes through the service-role
 * client (the only role allowed to touch profiles' billing columns).
 */
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripeClient().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const db = supabaseServiceRole();
  if (!db) return NextResponse.json({ error: "Service role not configured." }, { status: 503 });

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      const interval = session.metadata?.interval === "yearly" ? "yearly" : "monthly";
      if (customerId) {
        await db
          .from("profiles")
          .update({
            plan: "plus",
            plan_status: "active",
            stripe_subscription_id: subscriptionId ?? null,
            billing_interval: interval,
          })
          .eq("stripe_customer_id", customerId);
      }
      break;
    }
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
      if (customerId) {
        const planStatus =
          subscription.status === "active"
            ? "active"
            : subscription.status === "past_due" || subscription.status === "unpaid"
              ? "past_due"
              : subscription.status === "canceled"
                ? "canceled"
                : "past_due";
        const plan = planStatus === "canceled" ? "free" : "plus";
        await db.from("profiles").update({ plan, plan_status: planStatus }).eq("stripe_customer_id", customerId);
      }
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
      if (customerId) {
        await db.from("profiles").update({ plan: "free", plan_status: "canceled" }).eq("stripe_customer_id", customerId);
      }
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (customerId) {
        await db.from("profiles").update({ plan_status: "past_due" }).eq("stripe_customer_id", customerId);
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
