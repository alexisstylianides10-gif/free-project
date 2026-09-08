"use client";

import { useTranslations } from "next-intl";
import { StaticContentPage, LegalDraftNotice } from "@/components/shared/StaticContentPage";
import { branding } from "@/lib/branding";

// `PrivacyClient` is a client component ("use client", useTranslations) and
// can't co-locate the `metadata` export in the same file — see page.tsx for
// the thin server wrapper that keeps `/privacy`'s real canonical/title while
// this owns the actual translated content.
export function PrivacyClient() {
  const t = useTranslations("PrivacyPage");
  const name = branding.name;

  return (
    <StaticContentPage title={t("title")} lastUpdated={t("lastUpdated")}>
      <LegalDraftNotice />

      <p>{t("intro", { name })}</p>

      <h2 className="text-body font-semibold text-foreground">{t("whoWeAreTitle")}</h2>
      <p>{t("whoWeAreBody", { name })}</p>

      <h2 className="text-body font-semibold text-foreground">{t("infoCollectTitle")}</h2>
      <p>{t("infoCollectIntro")}</p>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>{t("infoCollectAccount")}</li>
        <li>{t("infoCollectOnboarding", { name })}</li>
        <li>{t("infoCollectContent")}</li>
        <li>{t("infoCollectBilling")}</li>
      </ul>
      <p>{t("noAdTrackers", { name })}</p>

      <h2 className="text-body font-semibold text-foreground">{t("howWeUseTitle")}</h2>
      <p>{t("howWeUseIntro")}</p>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>{t("howWeUseCore")}</li>
        <li>{t("howWeUseAi")}</li>
        <li>{t("howWeUseBilling")}</li>
        <li>{t("howWeUseComms")}</li>
        <li>{t("howWeUseSecurity")}</li>
      </ul>

      <h2 className="text-body font-semibold text-foreground">{t("whereStoredTitle")}</h2>
      <p>{t("whereStoredBody", { name })}</p>

      <h2 className="text-body font-semibold text-foreground">{t("aiProcessingTitle")}</h2>
      <p>{t("aiProcessingBody", { name })}</p>

      <h2 className="text-body font-semibold text-foreground">{t("paymentsTitle")}</h2>
      <p>{t("paymentsBody", { name })}</p>

      <h2 className="text-body font-semibold text-foreground">{t("noSellTitle")}</h2>
      <p>{t("noSellBody")}</p>

      <h2 className="text-body font-semibold text-foreground">{t("choicesTitle")}</h2>
      <p>{t("choicesBody", { name })}</p>

      <h2 className="text-body font-semibold text-foreground">{t("minorsTitle")}</h2>
      <p>{t("minorsBody", { name })}</p>

      <h2 className="text-body font-semibold text-foreground">{t("changesTitle")}</h2>
      <p>{t("changesBody", { name })}</p>

      <p>{t("questionsLine")}</p>
    </StaticContentPage>
  );
}
