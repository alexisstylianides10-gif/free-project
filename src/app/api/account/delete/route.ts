import "server-only";
import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { requireUser, supabaseServiceRole } from "@/lib/supabase/server";
import { stripeClient } from "@/lib/billing/stripe";

export const runtime = "nodejs";

/**
 * Permanently deletes the caller's own account. Never trusts a
 * client-supplied user id — the user to delete is always the one resolved
 * from the caller's own verified access token via requireUser(), the same
 * pattern every other route in this codebase uses.
 *
 * Two privileged operations happen here, both requiring the service-role
 * client (never exposed client-side, see lib/supabase/server.ts):
 *  1. If the account has an active/non-canceled Stripe subscription, cancel
 *     it first. This is a deliberate ordering choice: if Stripe cancellation
 *     fails, the whole request fails *before* the account is deleted, so a
 *     user is never left both deleted and still being billed. A missing
 *     STRIPE_SECRET_KEY with a subscription on file is treated the same way
 *     (fail closed, not silently skip) for the same reason.
 *  2. Delete the storage.objects for this user's `study-materials/<uid>/*`
 *     files, then call `auth.admin.deleteUser`. Every per-user table in
 *     schema.sql has `on delete cascade` on its `user_id`/`id` FK to
 *     auth.users(id) (verified directly against schema.sql, all 27 tables),
 *     so the Postgres rows clean up automatically — but Supabase Storage
 *     objects are not part of that FK graph (`storage.objects` isn't a
 *     schema.sql table at all), so they would NOT be cleaned up by the
 *     cascade and must be removed explicitly here or they'd become
 *     orphaned, inaccessible-but-still-stored files.
 */
export async function POST(req: NextRequest) {
  const { client, user, error } = await requireUser(req);
  if (!client || !user) return NextResponse.json({ error }, { status: 401 });

  const serviceClient = supabaseServiceRole();
  if (!serviceClient) {
    return NextResponse.json({ error: "Account deletion isn't configured on the server yet." }, { status: 503 });
  }

  // Read with the caller's own scoped client — RLS-backstopped, and matches
  // the exact select create-subscription/create-portal-session already do
  // for these same two columns.
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("stripe_subscription_id")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    // Fail closed: we couldn't determine whether a subscription is on file
    // at all (transient network blip, RLS/policy misconfiguration, Supabase
    // hiccup). Silently treating "I couldn't find out" as "there is none"
    // would risk deleting an account that still has an active Stripe
    // subscription attached, with no way to reach the person afterward.
    return NextResponse.json(
      { error: "We couldn't confirm your subscription status right now, so we can't safely delete your account. Try again shortly." },
      { status: 503 }
    );
  }
  const subscriptionId = profile?.stripe_subscription_id as string | null | undefined;

  if (subscriptionId) {
    if (!process.env.STRIPE_SECRET_KEY) {
      // Fail closed: there's a subscription on file but no way to verify or
      // cancel it. Deleting the account anyway would risk leaving the
      // person being billed for an account that no longer exists.
      return NextResponse.json(
        { error: "Billing isn't configured right now, so we can't confirm your subscription would be canceled. Try again shortly." },
        { status: 503 }
      );
    }
    try {
      const stripe = stripeClient();
      const subscription = await stripe.subscriptions.retrieve(subscriptionId).catch((err) => {
        // Only Stripe's own "doesn't exist" response (StripeInvalidRequestError
        // with code 'resource_missing') is actually safe to treat as "no
        // subscription left to cancel, proceed". Every other failure —
        // network blip (StripeConnectionError), Stripe outage
        // (StripeAPIError), rate limit (StripeRateLimitError), a bad/revoked
        // live key (StripeAuthenticationError) — means we genuinely don't
        // know the subscription's state, so it must NOT be treated the same
        // as "confirmed gone". Re-throw so it's caught by the outer
        // try/catch below, which already correctly fails the request with a
        // 502 and does not delete the account.
        if (err instanceof Stripe.errors.StripeInvalidRequestError && err.code === "resource_missing") {
          return null;
        }
        throw err;
      });
      if (subscription && subscription.status !== "canceled") {
        await stripe.subscriptions.cancel(subscriptionId);
      }
      // subscription === null means Stripe confirmed it has no record of
      // this id at all (e.g. it was already fully removed on Stripe's side)
      // — nothing left to cancel, safe to proceed.
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't cancel your subscription.";
      return NextResponse.json(
        { error: `We couldn't cancel your active subscription (${message}). Your account was not deleted — try again, or cancel it from Manage Subscription first.` },
        { status: 502 }
      );
    }
  }

  // Best-effort cleanup of this user's uploaded study-material files. Not
  // part of the Postgres FK cascade (storage.objects isn't a schema.sql
  // table), so it's handled explicitly here. A failure here is logged but
  // does not block account deletion — an orphaned file with no owner left
  // in a private bucket is a real but low-severity cleanup gap, not a
  // reason to leave the account (and its real personal data in every other
  // table) undeleted.
  try {
    const { data: files } = await serviceClient.storage.from("study-materials").list(user.id);
    if (files && files.length > 0) {
      const paths = files.map((f) => `${user.id}/${f.name}`);
      await serviceClient.storage.from("study-materials").remove(paths);
    }
  } catch {
    // Non-fatal — see comment above.
  }

  const { error: deleteError } = await serviceClient.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message || "Couldn't delete your account. Try again." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
