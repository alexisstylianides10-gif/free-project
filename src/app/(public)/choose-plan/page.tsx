import type { Metadata } from "next";
import { siteUrl } from "@/lib/branding";
import { ChoosePlanClient } from "./ChoosePlanClient";

// See login/page.tsx for why this thin server wrapper exists: `ChoosePlanClient`
// is a client component and can't export `metadata` itself, so this gives
// `/choose-plan` its own real canonical instead of inheriting the root
// layout's `alternates.canonical: "/"`.
export const metadata: Metadata = {
  title: "Choose your plan",
  alternates: { canonical: `${siteUrl}/choose-plan` },
};

export default function ChoosePlanPage() {
  return <ChoosePlanClient />;
}
