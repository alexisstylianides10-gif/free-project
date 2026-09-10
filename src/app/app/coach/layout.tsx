"use client";

import { PaywallGate } from "@/components/shared/PaywallGate";

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return <PaywallGate>{children}</PaywallGate>;
}
