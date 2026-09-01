import type { Metadata } from "next";
import { StaticContentPage } from "@/components/shared/StaticContentPage";
import { branding } from "@/lib/branding";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <StaticContentPage title="Terms of Service">
      <p>
        Our full Terms of Service are being finalized and will be published here shortly. They&rsquo;ll cover how
        {` ${branding.name}`} can be used, your account responsibilities, and our subscription/billing terms.
      </p>
      <p>Have a question in the meantime? Reach out and we&rsquo;ll answer it directly.</p>
    </StaticContentPage>
  );
}
