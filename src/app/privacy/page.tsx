import type { Metadata } from "next";
import { StaticContentPage } from "@/components/shared/StaticContentPage";
import { branding } from "@/lib/branding";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <StaticContentPage title="Privacy Policy">
      <p>
        Our full Privacy Policy is being finalized and will be published here shortly. It will explain exactly what
        {` ${branding.name}`} collects, how it&rsquo;s used, and the choices you have about it.
      </p>
      <p>Have a question about your data in the meantime? Reach out and we&rsquo;ll answer it directly.</p>
    </StaticContentPage>
  );
}
