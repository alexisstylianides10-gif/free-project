"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { completeOnboarding, loadPendingOnboarding, clearPendingOnboarding } from "@/lib/onboarding/completeOnboarding";
import { BottomNav } from "@/components/shared/BottomNav";
import { LoadingScreen } from "@/components/shared/LoadingScreen";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const [recovering, setRecovering] = useState(false);
  const attemptedRecovery = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    if (profile && !profile.onboarding_completed && !attemptedRecovery.current) {
      attemptedRecovery.current = true;
      const pending = loadPendingOnboarding();
      if (pending && supabase) {
        setRecovering(true);
        completeOnboarding(supabase, user.id, user.email?.split("@")[0] ?? "Student", pending)
          .then(() => {
            clearPendingOnboarding();
            return refreshProfile();
          })
          .finally(() => setRecovering(false));
      } else {
        router.replace("/onboarding");
      }
    }
  }, [loading, user, profile, router, refreshProfile]);

  if (loading || !user || !profile) {
    return <LoadingScreen message="Signing you in…" />;
  }

  if (recovering || !profile.onboarding_completed) {
    return <LoadingScreen message="Building your plan…" />;
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-md px-5 pb-28 pt-6">{children}</div>
      <BottomNav />
    </div>
  );
}
