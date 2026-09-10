"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { StaticContentPage, LegalDraftNotice } from "@/components/shared/StaticContentPage";
import { branding } from "@/lib/branding";

// See privacy/PrivacyClient.tsx for why this file is split from page.tsx
// (metadata must come from a Server Component; this owns the translated
// content).
export function TermsClient() {
  const t = useTranslations("TermsPage");
  const name = branding.name;

  return (
    <StaticContentPage title={t("title")} lastUpdated={t("lastUpdated")}>
      <LegalDraftNotice />

      <p>{t("intro", { name })}</p>

      <h2 className="text-body font-semibold text-foreground">{t("accountTitle")}</h2>
      <p>{t("accountBody1", { name })}</p>
      <p>{t("accountBody2")}</p>

      <h2 className="text-body font-semibold text-foreground">{t("usingTitle", { name })}</h2>
      <p>{t("usingIntro", { name })}</p>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>{t("usingRule1")}</li>
        <li>{t("usingRule2")}</li>
        <li>{t("usingRule3")}</li>
        <li>{t("usingRule4", { name })}</li>
      </ul>
      <p>{t("usingSuspend")}</p>

      <h2 className="text-body font-semibold text-foreground">{t("contentTitle")}</h2>
      <p>
        {t.rich("contentBody", {
          name,
          privacyLink: (chunks) => (
            <Link href="/privacy" className="font-semibold text-foreground underline underline-offset-4">
              {chunks}
            </Link>
          ),
        })}
      </p>

      <h2 className="text-body font-semibold text-foreground">{t("aiFeaturesTitle")}</h2>
      <p>{t("aiFeaturesBody", { name })}</p>

      <h2 className="text-body font-semibold text-foreground">{t("billingTitle")}</h2>
      <p>{t("billingBody", { name })}</p>

      <h2 className="text-body font-semibold text-foreground">{t("endingTitle")}</h2>
      <p>{t("endingBody", { name })}</p>

      <h2 className="text-body font-semibold text-foreground">{t("disclaimersTitle")}</h2>
      <p>{t("disclaimersBody", { name })}</p>

      <h2 className="text-body font-semibold text-foreground">{t("changesTitle")}</h2>
      <p>{t("changesBody", { name })}</p>

      <h2 className="text-body font-semibold text-foreground">{t("contactTitle")}</h2>
      <p>{t("contactBody")}</p>
    </StaticContentPage>
  );
}
