"use client";

import { PaywallGate } from "@/components/shared/PaywallGate";

export default function SubjectsLayout({ children }: { children: React.ReactNode }) {
  return <PaywallGate>{children}</PaywallGate>;
}
