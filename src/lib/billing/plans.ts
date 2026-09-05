export type Track = "student" | "business";
export type BillingInterval = "monthly" | "yearly";

export interface PlanOption {
  track: Track;
  interval: BillingInterval;
  priceUsd: number;
  /** Name of the Railway/Stripe env var holding this option's Stripe Price id. */
  envVar: string;
}

/** Single source of truth for pricing — the display copy on /choose-plan and
 * /app/upgrade, and the Stripe price lookup in create-subscription, both
 * read from here so a price never has to be typed in more than one place. */
export const PLAN_OPTIONS: PlanOption[] = [
  { track: "student", interval: "monthly", priceUsd: 9.99, envVar: "STRIPE_PRICE_STUDENT_MONTHLY" },
  { track: "student", interval: "yearly", priceUsd: 99, envVar: "STRIPE_PRICE_STUDENT_YEARLY" },
  { track: "business", interval: "monthly", priceUsd: 19.99, envVar: "STRIPE_PRICE_BUSINESS_MONTHLY" },
  { track: "business", interval: "yearly", priceUsd: 199, envVar: "STRIPE_PRICE_BUSINESS_YEARLY" },
];

export function getPlanOption(track: Track, interval: BillingInterval): PlanOption {
  const option = PLAN_OPTIONS.find((o) => o.track === track && o.interval === interval);
  if (!option) throw new Error(`No plan option for track=${track} interval=${interval}`);
  return option;
}

export const TRACK_LABEL: Record<Track, string> = {
  student: "Student",
  business: "Business",
};
