"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { SchoolSubNav } from "./SchoolSubNav";

/** The sub-nav (Subjects/Exams/Flashcards/Quizzes/Progress) is the Study
 * system — student-only. Business accounts only ever have the one Plan
 * page under this route, so they get no header/sub-nav chrome here at all;
 * BusinessPlanHome renders its own. */
export default function SchoolLayout({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();

  if (profile?.track === "business") {
    return <div className="pb-4">{children}</div>;
  }

  return (
    <div className="space-y-5 pb-4">
      <ScreenHeader title="My School" subtitle="Class, homework, exams, and your AI study coach." />
      <SchoolSubNav />
      <div>{children}</div>
    </div>
  );
}
