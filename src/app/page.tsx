"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { branding } from "@/lib/branding";

export default function WelcomePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;
    router.replace(profile?.onboarding_completed ? "/app" : "/onboarding");
  }, [loading, user, profile, router]);

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-background px-6 pb-10 pt-16">
      <div className="bg-ambient-glow pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative z-10 flex flex-1 flex-col justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-sm font-extrabold text-white shadow-glow-accent">
              F
            </span>
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
            href="/onboarding"
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
