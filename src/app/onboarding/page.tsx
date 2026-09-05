"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import StudentOnboarding from "./StudentOnboarding";
import BusinessOnboarding from "./BusinessOnboarding";

/** Routes to the track-specific onboarding flow chosen at /choose-plan. */
export default function OnboardingPage() {
  const { profile, loading } = useAuth();

  if (loading || !profile) {
    return <LoadingScreen message="Getting things ready…" />;
  }

  return profile.track === "business" ? <BusinessOnboarding /> : <StudentOnboarding />;
}
