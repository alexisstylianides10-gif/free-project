"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { LogoMark } from "@/components/shared/LogoMark";
import { BrandPanel } from "@/components/shared/BrandPanel";
import { branding } from "@/lib/branding";

const PROOF = [
  { value: "Student · Founder", label: "Two tracks, one app" },
  { value: "Built from your data", label: "Daily plan" },
  { value: "No card required", label: "Free to start" },
];

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
    <main className="relative flex min-h-dvh overflow-hidden bg-background lg:items-stretch">
      <div className="bg-ambient-glow pointer-events-none absolute inset-0 lg:hidden" aria-hidden />

      <div className="relative z-10 flex w-full flex-1 flex-col px-6 pb-10 pt-16 md:px-10 lg:justify-center lg:px-16 lg:pb-16 lg:pt-0 xl:px-20">
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-between md:max-w-md lg:max-w-lg lg:flex-none lg:justify-start lg:gap-10">
          <div>
            <div className="flex items-center gap-2">
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
              Your AI coach turns a locked-in track — school or startup — into a daily plan, real deadlines, and a
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
    </main>
  );
}
