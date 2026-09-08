import type { Metadata } from "next";
import { siteUrl } from "@/lib/branding";
import { TermsClient } from "./TermsClient";

// See login/page.tsx for why this thin server wrapper exists: `TermsClient`
// is a client component (useTranslations) and can't export `metadata` itself.
export const metadata: Metadata = {
  title: "Terms of Service",
  alternates: { canonical: `${siteUrl}/terms` },
};

export default function TermsPage() {
  return <TermsClient />;
}
