"use client";

import { PaywallGate } from "@/components/shared/PaywallGate";

// Scoped to this AI-help sub-route only, not the whole /homework tree — the
// homework list itself (add/edit/delete/complete) is plain free-tier CRUD,
// same as Exams and the homework section that used to live on School Home.
// Only the AI tutor conversation is a paywalled AI-cost feature.
export default function HomeworkHelpLayout({ children }: { children: React.ReactNode }) {
  return <PaywallGate>{children}</PaywallGate>;
}
