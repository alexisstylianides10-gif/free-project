import type { Metadata } from "next";
import { siteUrl } from "@/lib/branding";
import { PricingClient } from "./PricingClient";

// See choose-plan/page.tsx for why this thin server wrapper exists:
// `PricingClient` is a client component (it owns the monthly/yearly toggle
// state) and can't export `metadata` itself.
export const metadata: Metadata = { title: "Pricing", alternates: { canonical: `${siteUrl}/pricing` } };

export default function PricingPage() {
  return <PricingClient />;
}
