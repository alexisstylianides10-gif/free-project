import { NextRequest, NextResponse } from "next/server";
import { requireUser, supabaseServiceRole } from "@/lib/supabase/server";
import { isStripeConfigured, stripeClient } from "@/lib/stripe/client";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) return NextResponse.json({ error: "Billing isn't set up yet." }, { status: 501 });
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error: error ?? "Unauthorized." }, { status: 401 });

  const { data: profile } = await client.from("profiles").select("stripe_subscription_id").eq("id", user.id).maybeSingle();
  if (!profile?.stripe_subscription_id) return NextResponse.json({ error: "You don't have an active subscription." }, { status: 400 });

  const stripe = stripeClient();
  // cancel_at_period_end (not an immediate cancel.delete) so access keeps working
  // until the day the plan actually renews — matches every real subscription app.
  const subscription = await stripe.subscriptions.update(profile.stripe_subscription_id as string, { cancel_at_period_end: true });

  const periodEnd = subscription.items.data[0]?.current_period_end;
  const currentPeriodEnd = new Date((periodEnd ?? Math.floor(Date.now() / 1000)) * 1000).toISOString();
  // cancel_at_period_end/current_period_end are locked to service-role
  // writes only — see the profiles column-privilege migration.
  const serviceRole = supabaseServiceRole();
  if (serviceRole) await serviceRole.from("profiles").update({ cancel_at_period_end: true, current_period_end: currentPeriodEnd }).eq("id", user.id);

  return NextResponse.json({ ok: true, currentPeriodEnd });
}
