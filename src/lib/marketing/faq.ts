"use client";

import { useTranslations } from "next-intl";

// Moved verbatim out of pricing/PricingClient.tsx (was PRICING_FAQ, local to
// that file). Same 4 Q&A pairs, now sourced from the "PricingFaq" i18n
// namespace so PricingSection (standalone /pricing + inline on /) and
// FaqSection (/ only) both read one shared, translated source instead of two
// copies existing — see PRODUCT_SPECS_SCROLL_LANDING.md §4.
const KEYS = ["freePlan", "trial", "billingInterval", "switchTracks"] as const;

export function usePricingFaq(): { q: string; a: string }[] {
  const t = useTranslations("PricingFaq");
  return KEYS.map((key) => ({ q: t(`${key}.q`), a: t(`${key}.a`) }));
}
