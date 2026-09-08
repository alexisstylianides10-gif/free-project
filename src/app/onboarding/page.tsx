"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/components/providers/AuthProvider";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import StudentOnboarding from "./StudentOnboarding";
import BusinessOnboarding from "./BusinessOnboarding";

/** Routes to the track-specific onboarding flow chosen at /choose-plan. */
export default function OnboardingPage() {
  const { profile, loading } = useAuth();
  const t = useTranslations("OnboardingPage");

  if (loading || !profile) {
    return <LoadingScreen message={t("gettingReady")} />;
  }

  return profile.track === "business" ? <BusinessOnboarding /> : <StudentOnboarding />;
}
