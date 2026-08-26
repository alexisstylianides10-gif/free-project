"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { LogoMark } from "@/components/shared/LogoMark";
import { branding } from "@/lib/branding";

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
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-background px-6 pb-10 pt-16 md:px-10">
      <div className="bg-ambient-glow pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative z-10 mx-auto flex w-full max-w-sm flex-1 flex-col justify-between md:max-w-md lg:max-w-lg">
        <div>
          <div className="flex items-center gap-2">
            <LogoMark size={36} className="shadow-glow-accent" />
            <span className="text-sm font-semibold tracking-wide text-muted-foreground">{branding.name}</span>
          </div>

          <h1 className="mt-14 text-[34px] font-extrabold leading-[1.15] tracking-tight text-foreground">
            Build your future
            <br />
            while you build your{" "}
            <span className="text-gradient-brand">grades.</span>
          </h1>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
            Your AI coach will help you stay on top of school, discover your strengths, and build a path toward the
            future you want.
          </p>
        </div>

        <div className="mt-16 space-y-4">
          <Link
            href="/signup"
            className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-gradient-brand text-[15px] font-semibold text-white shadow-glow-accent transition-transform active:scale-[0.98]"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="text-center text-sm text-muted-foreground">
            Already building your future?{" "}
            <Link href="/login" className="font-semibold text-foreground underline underline-offset-4">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
