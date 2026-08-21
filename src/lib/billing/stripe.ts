import "server-only";
import Stripe from "stripe";

let cachedClient: Stripe | null = null;

/** Shared Stripe client for every billing route — same
 * lazy-init-and-cache convention as studyAnthropicClient() in
 * src/lib/study/ai.ts. */
export function stripeClient(): Stripe {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) throw new Error("STRIPE_SECRET_KEY is not configured on the server.");
  if (!cachedClient) cachedClient = new Stripe(apiKey);
  return cachedClient;
}
