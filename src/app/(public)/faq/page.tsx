import type { Metadata } from "next";
import { siteUrl } from "@/lib/branding";
import { FaqPageClient } from "./FaqPageClient";

// See login/page.tsx for why this thin server wrapper exists: `FaqPageClient`
// is a client component (useTranslations) and can't export `metadata` itself.
export const metadata: Metadata = { title: "FAQ", alternates: { canonical: `${siteUrl}/faq` } };

export default function FaqPage() {
  return <FaqPageClient />;
}
