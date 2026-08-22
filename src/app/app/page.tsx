"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import StudentHome from "./StudentHome";
import BusinessHome from "./BusinessHome";

/** The Home tab branches entirely on the account's track. */
export default function HomeTabPage() {
  const { profile } = useAuth();
  if (!profile) return null;
  return profile.track === "business" ? <BusinessHome /> : <StudentHome />;
}
