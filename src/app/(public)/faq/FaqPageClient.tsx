"use client";

import { useTranslations } from "next-intl";
import { StaticContentPage } from "@/components/shared/StaticContentPage";
import { branding } from "@/lib/branding";

const QUESTION_KEYS = ["whatIsAlxioum", "isThereFree", "canSwitchTracks"] as const;

// See privacy/PrivacyClient.tsx for why this file is split from page.tsx.
export function FaqPageClient() {
  const t = useTranslations("FaqPage");
  const name = branding.name;

  return (
    <StaticContentPage title={t("title")}>
      <div className="space-y-6">
        {QUESTION_KEYS.map((key) => (
          <div key={key}>
            <p className="font-semibold text-foreground">{t(`${key}.q`)}</p>
            <p className="mt-1">{t(`${key}.a`, { name })}</p>
          </div>
        ))}
      </div>
      <p>{t("moreQuestions")}</p>
    </StaticContentPage>
  );
}
