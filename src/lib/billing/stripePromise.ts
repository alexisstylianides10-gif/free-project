import { loadStripe, type Stripe } from "@stripe/stripe-js";

let cached: Promise<Stripe | null> | null = null;

/** Lazily loads Stripe.js once and reuses the same promise for every
 * <Elements> mount, same convention as the server's stripeClient(). */
export function getStripePromise(): Promise<Stripe | null> {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) return Promise.resolve(null);
  if (!cached) cached = loadStripe(publishableKey);
  return cached;
}
