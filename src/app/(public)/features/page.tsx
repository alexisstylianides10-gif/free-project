import type { Metadata } from "next";
import { MarketingNav } from "@/components/shared/MarketingNav";
import { SiteFooter } from "@/components/shared/SiteFooter";
import { FeaturesSection } from "@/components/marketing/FeaturesSection";
import { siteUrl } from "@/lib/branding";

export const metadata: Metadata = { title: "Features", alternates: { canonical: `${siteUrl}/features` } };

// Thin wrapper — body lives in FeaturesSection (shared with the inline
// section on /), rendered here with no props so it defaults to the exact
// same output as before this route was extracted. See
// PRODUCT_SPECS_SCROLL_LANDING.md §2, §7.
export default function FeaturesPage() {
  return (
    <main className="min-h-dvh bg-background">
      <MarketingNav />
      <FeaturesSection />
      <SiteFooter />
    </main>
  );
}
