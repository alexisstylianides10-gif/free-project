import type { Plan } from "@/lib/types";

export type PaidPlan = "Student" | "Pro" | "Max";
export type BillingCycle = "monthly" | "yearly";

const PAID_PLANS: PaidPlan[] = ["Student", "Pro", "Max"];

export function isPaidPlan(plan: string): plan is PaidPlan {
  return (PAID_PLANS as string[]).includes(plan);
}

/** Price IDs live in env vars (set once real Stripe Products/Prices exist) rather than in code, since test-mode and live-mode IDs differ. */
export function stripePriceId(plan: PaidPlan, cycle: BillingCycle): string | null {
  const key = `STRIPE_PRICE_${plan.toUpperCase()}_${cycle.toUpperCase()}`;
  return process.env[key] || null;
}

/** Reverse lookup used by the webhook handler: given a Stripe price id, which Alxioum plan does it correspond to? */
export function planFromPriceId(priceId: string): Plan | null {
  for (const plan of PAID_PLANS) {
    for (const cycle of ["monthly", "yearly"] as const) {
      if (stripePriceId(plan, cycle) === priceId) return plan;
    }
  }
  return null;
}
