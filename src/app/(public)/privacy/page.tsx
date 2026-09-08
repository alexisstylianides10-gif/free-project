import type { Metadata } from "next";
import { siteUrl } from "@/lib/branding";
import { PrivacyClient } from "./PrivacyClient";

// See login/page.tsx for why this thin server wrapper exists: `PrivacyClient`
// is a client component (useTranslations) and can't export `metadata` itself.
export const metadata: Metadata = {
  title: "Privacy Policy",
  alternates: { canonical: `${siteUrl}/privacy` },
};

export default function PrivacyPage() {
  return <PrivacyClient />;
}
