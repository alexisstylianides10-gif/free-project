"use client";

import { MarketingNav } from "@/components/shared/MarketingNav";
import { SiteFooter } from "@/components/shared/SiteFooter";
import { PricingSection } from "@/components/marketing/PricingSection";

// Thin wrapper — body lives in PricingSection (shared with the inline
// section on /), rendered here with no props so it defaults to the exact
// same output as before this route was extracted, including its embedded
// FAQ strip. Stays a client component (see pricing/page.tsx's comment for
// why the metadata wrapper is split out) even though the toggle state
// itself now lives inside PricingSection. See
// PRODUCT_SPECS_SCROLL_LANDING.md §2, §4, §7.
export function PricingClient() {
  return (
    <main className="min-h-dvh bg-background">
      <MarketingNav />
      <PricingSection />
      <SiteFooter />
    </main>
  );
}
