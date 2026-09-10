"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import StudentFutureHome from "./StudentFutureHome";
import BusinessGrowHome from "./BusinessGrowHome";

/** "Future" (career matches/roadmap) for students, "Grow" (metrics/content/
 * competitors) for founders — same route, content branches on track. */
export default function FutureTabPage() {
  const { profile } = useAuth();
  if (!profile) return null;
  return profile.track === "business" ? <BusinessGrowHome /> : <StudentFutureHome />;
}
