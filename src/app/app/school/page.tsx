"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import StudentSchoolHome from "./StudentSchoolHome";
import BusinessPlanHome from "./BusinessPlanHome";

/** "School" for students, "Plan" for founders — same route, same tab bar
 * position, content branches on the account's track. */
export default function SchoolTabPage() {
  const { profile } = useAuth();
  if (!profile) return null;
  return profile.track === "business" ? <BusinessPlanHome /> : <StudentSchoolHome />;
}
