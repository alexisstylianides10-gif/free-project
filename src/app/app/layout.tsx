"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { BottomNav } from "@/components/shared/BottomNav";
import { SidebarNav } from "@/components/shared/SidebarNav";
import { TopBar } from "@/components/shared/TopBar";
import { LoadingScreen } from "@/components/shared/LoadingScreen";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
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

  if (loading || !user || !profile) {
    return <LoadingScreen message="Signing you in…" />;
  }

  if (!profile.onboarding_completed) {
    return <LoadingScreen message="Just a moment…" />;
  }

  return (
    <div className="min-h-dvh bg-background md:flex">
      <SidebarNav />
      <div className="min-w-0 md:flex-1">
        <TopBar />
        <div className="mx-auto max-w-md px-5 pb-28 pt-6 md:max-w-3xl md:px-10 md:pb-10 md:pt-8 lg:max-w-5xl xl:max-w-6xl">
          {children}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
