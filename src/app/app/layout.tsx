"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { AchievementToastProvider } from "@/components/providers/AchievementToastProvider";
import { BottomNav } from "@/components/shared/BottomNav";
import { SidebarNav } from "@/components/shared/SidebarNav";
import { TopBar } from "@/components/shared/TopBar";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { Button } from "@/components/ui/Button";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, profileLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    if (profile && !profile.onboarding_completed) {
      router.replace(profile.billing_interval ? "/onboarding" : "/choose-plan");
    }
  }, [loading, user, profile, router]);

  if (loading || !user || profileLoading) {
    return <LoadingScreen message="Signing you in…" />;
  }

  // AuthProvider flips `loading` false once its initial-mount profile fetch
  // resolves, AND tracks every *subsequent* auth event's own profile fetch
  // (e.g. a fresh sign-in) via `profileLoading` — see AuthProvider.tsx. Both
  // are checked above, so reaching here with a user but no profile means the
  // row is genuinely absent, not still in flight under either path. This
  // happens if account setup (signup or first login) failed partway through
  // — e.g. the profiles insert errored after auth succeeded. There's no way
  // for a profile to spontaneously appear from here, so show a way out
  // instead of spinning forever.
  if (!profile) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/15">
          <AlertTriangle className="h-6 w-6 text-danger" />
        </span>
        <h1 className="mt-6 text-xl font-bold text-foreground">We couldn&apos;t find your profile</h1>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          Your account exists, but setup didn&apos;t finish. Logging back in usually fixes this.
        </p>
        <Link href="/login" className="mt-8">
          <Button size="lg">Go to log in</Button>
        </Link>
      </div>
    );
  }

  if (!profile.onboarding_completed) {
    return <LoadingScreen message="Just a moment…" />;
  }

  return (
    <AchievementToastProvider>
      <div className="min-h-dvh bg-background md:flex">
        <SidebarNav />
        <div className="relative min-w-0 md:flex-1">
          {/* Ambient background glow — desktop only. Two soft blurred brand-
              gradient blobs fixed behind the scrolling content so the wide
              canvas has depth instead of reading as flat/empty. */}
          <div className="pointer-events-none fixed inset-0 z-0 hidden overflow-hidden md:block">
            <div className="absolute -top-32 right-[-10%] h-[520px] w-[520px] rounded-full bg-gradient-brand opacity-[0.10] blur-[140px]" />
            <div className="absolute bottom-[-15%] left-[10%] h-[420px] w-[420px] rounded-full bg-gradient-mission opacity-[0.07] blur-[140px]" />
          </div>

          <div className="relative z-10">
            <TopBar />
            <div className="mx-auto max-w-md px-5 pb-28 pt-6 md:max-w-3xl md:px-10 md:pb-10 md:pt-8 lg:max-w-5xl xl:max-w-6xl">
              {children}
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
    </AchievementToastProvider>
  );
}
