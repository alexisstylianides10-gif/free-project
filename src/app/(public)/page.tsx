"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, X } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { LogoMark } from "@/components/shared/LogoMark";
import { BrandPanel } from "@/components/shared/BrandPanel";
import { MarketingNav } from "@/components/shared/MarketingNav";
import { SiteFooter } from "@/components/shared/SiteFooter";
import { FeaturesSection } from "@/components/marketing/FeaturesSection";
import { PricingSection } from "@/components/marketing/PricingSection";
import { AboutSection } from "@/components/marketing/AboutSection";
import { FaqSection } from "@/components/marketing/FaqSection";
import { branding } from "@/lib/branding";

const PROOF = [
  { value: "Student · Founder", label: "Two tracks, one app" },
  { value: "Built from your data", label: "Daily plan" },
  { value: "No card required", label: "Free to start" },
];

/**
 * Reads the `?deleted=1` query param set by profile/page.tsx after a
 * successful account deletion. Split out and wrapped in its own Suspense
 * boundary below because useSearchParams() forces the whole subtree it's
 * called in to opt out of static prerendering unless isolated like this —
 * without it `next build` fails outright ("useSearchParams() should be
 * wrapped in a suspense boundary") rather than just warning.
 */
function DeletedAccountBanner() {
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(searchParams.get("deleted") === "1");
  }, [searchParams]);

  if (!visible) return null;

  return (
    <div className="mb-6 flex items-start gap-2.5 rounded-2xl border border-success/40 bg-success/10 p-4 text-sm text-foreground">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
      <span className="flex-1">Your account has been deleted.</span>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Dismiss"
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function WelcomePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;
    if (profile?.onboarding_completed) {
      router.replace("/app");
    } else if (!profile?.billing_interval) {
      router.replace("/choose-plan");
    } else {
      router.replace("/onboarding");
    }
  }, [loading, user, profile, router]);

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-background">
      <MarketingNav hideLogoOnMobile />
      <div className="relative flex flex-1 lg:items-stretch">
        <div className="bg-ambient-glow pointer-events-none absolute inset-0 lg:hidden" aria-hidden />

        <div className="relative z-10 flex w-full flex-1 flex-col px-6 pb-10 pt-16 md:px-10 lg:justify-center lg:px-16 lg:pb-16 lg:pt-0 xl:px-20">
          <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-between md:max-w-md lg:max-w-lg lg:flex-none lg:justify-start lg:gap-10">
            <div>
              <Suspense fallback={null}>
                <DeletedAccountBanner />
              </Suspense>
              <div className="flex items-center gap-2 md:hidden">
                <LogoMark size={36} className="shadow-glow-accent" />
                <span className="text-sm font-semibold tracking-wide text-muted-foreground">{branding.name}</span>
              </div>

              <h1 className="mt-14 text-display font-extrabold leading-[1.15] tracking-tight text-foreground lg:mt-10 lg:text-[46px] lg:leading-[1.12]">
                Build your future
                <br />
                while you build your{" "}
                <span className="text-gradient-brand">grades.</span>
              </h1>
              <p className="mt-4 max-w-sm text-body leading-relaxed text-muted-foreground lg:max-w-md">
                Your AI coach turns a locked-in track, school or startup, into a daily plan, real deadlines, and a
                future you can actually see.
              </p>
            </div>

            <div className="mt-16 space-y-4 lg:mt-0">
              <Link
                href="/signup"
                className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-gradient-brand text-body font-semibold text-white shadow-glow-accent transition-transform active:scale-[0.98] lg:w-auto lg:px-10"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="text-center text-sm text-muted-foreground lg:text-left">
                Already building your future?{" "}
                <Link href="/login" className="font-semibold text-foreground underline underline-offset-4">
                  Log in
                </Link>
              </p>
            </div>

            {/* Proof strip — real, checkable claims about the product, not stats.
                Fills what used to be a large empty gap on every viewport (most
                severe on desktop, present on mobile too) between the pitch and
                the CTA. */}
            <div className="flex items-start justify-between gap-3 border-t border-border pt-6 lg:pt-7">
              {PROOF.map((p) => (
                <div key={p.label} className="min-w-0">
                  <p className="text-xs font-extrabold leading-snug text-foreground lg:text-body">{p.value}</p>
                  <p className="mt-1 text-2xs text-muted-foreground lg:text-caption">{p.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <BrandPanel variant="landing" />
      </div>

      {/* Scrolling landing page sections — Hero above is unchanged; each
          section below is the same extracted, QA-approved content that
          renders standalone at /features, /pricing, /about, opted into the
          inline-on-/ visual treatment (top divider + its own background
          band) via withSectionBreak/sectionBreak. See
          PRODUCT_SPECS_SCROLL_LANDING.md §5, §7.

          headingLevel="h2" on all three: the Hero's <h1> above is the page's
          one and only <h1> once these sections are mounted inline here, so
          each section's own main heading demotes to <h2> — matching
          FaqSection's existing <h2> convention. Standalone /features,
          /pricing, /about all omit this prop and keep their <h1> unchanged.
          See PROJECT_STATE.md "DEV FIX (scroll landing heading
          hierarchy)". */}
      <FeaturesSection withSectionBreak headingLevel="h2" />
      <PricingSection withSectionBreak showFaqStrip={false} headingLevel="h2" />
      <AboutSection sectionBreak headingLevel="h2" />
      <FaqSection />

      <SiteFooter />
    </main>
  );
}
