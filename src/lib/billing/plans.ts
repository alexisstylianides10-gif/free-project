export type Track = "student" | "business";
export type BillingInterval = "monthly" | "yearly";
export type Currency = "usd" | "eur";

export interface PlanOption {
  track: Track;
  interval: BillingInterval;
  priceUsd: number;
  priceEur: number;
  /** Name of the Render/Stripe env var holding this option's USD Stripe Price id. */
  envVar: string;
  /** Name of the Render/Stripe env var holding this option's EUR Stripe Price id. */
  envVarEur: string;
}

/** Single source of truth for pricing — the display copy on /choose-plan and
 * /app/upgrade, and the Stripe price lookup in create-subscription, both
 * read from here so a price never has to be typed in more than one place. */
export const PLAN_OPTIONS: PlanOption[] = [
  { track: "student", interval: "monthly", priceUsd: 9.99, priceEur: 9.99, envVar: "STRIPE_PRICE_STUDENT_MONTHLY", envVarEur: "STRIPE_PRICE_STUDENT_MONTHLY_EUR" },
  { track: "student", interval: "yearly", priceUsd: 99, priceEur: 99, envVar: "STRIPE_PRICE_STUDENT_YEARLY", envVarEur: "STRIPE_PRICE_STUDENT_YEARLY_EUR" },
  { track: "business", interval: "monthly", priceUsd: 19.99, priceEur: 19.99, envVar: "STRIPE_PRICE_BUSINESS_MONTHLY", envVarEur: "STRIPE_PRICE_BUSINESS_MONTHLY_EUR" },
  { track: "business", interval: "yearly", priceUsd: 199, priceEur: 199, envVar: "STRIPE_PRICE_BUSINESS_YEARLY", envVarEur: "STRIPE_PRICE_BUSINESS_YEARLY_EUR" },
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

/** Eurozone countries from src/lib/catalog/countries.ts — stored verbatim on
 * profiles.country, so this must match those strings exactly. A student in
 * any other listed country (or with no country set yet) is billed in USD. */
const EUROZONE_COUNTRIES = new Set([
  "Austria",
  "Belgium",
  "Croatia",
  "Cyprus",
  "Estonia",
  "Finland",
  "France",
  "Germany",
  "Greece",
  "Ireland",
  "Italy",
  "Latvia",
  "Lithuania",
  "Luxembourg",
  "Malta",
  "Netherlands",
  "Portugal",
  "Slovakia",
  "Slovenia",
  "Spain",
]);

export function currencyForCountry(country?: string | null): Currency {
  return country && EUROZONE_COUNTRIES.has(country) ? "eur" : "usd";
}

export function priceForCurrency(option: PlanOption, currency: Currency): number {
  return currency === "eur" ? option.priceEur : option.priceUsd;
}

export function envVarForCurrency(option: PlanOption, currency: Currency): string {
  return currency === "eur" ? option.envVarEur : option.envVar;
}

export const CURRENCY_SYMBOL: Record<Currency, string> = { usd: "$", eur: "€" };
