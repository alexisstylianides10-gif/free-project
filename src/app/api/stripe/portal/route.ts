import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { isStripeConfigured, stripeClient } from "@/lib/stripe/client";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) return NextResponse.json({ error: "Billing isn't set up yet." }, { status: 501 });
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error: error ?? "Unauthorized." }, { status: 401 });

  const { data: profile } = await client.from("profiles").select("stripe_customer_id").eq("id", user.id).maybeSingle();
  if (!profile?.stripe_customer_id) return NextResponse.json({ error: "You don't have a billing account yet." }, { status: 400 });

  const stripe = stripeClient();
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id as string,
    return_url: `${site}/app/settings`,
  });

  return NextResponse.json({ url: session.url });
}
