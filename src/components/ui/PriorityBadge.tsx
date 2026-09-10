"use client";

import { useTranslations } from "next-intl";
import { Priority } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";

const TONE: Record<Priority, "danger" | "warning" | "neutral"> = {
  high: "danger",
  medium: "warning",
  low: "neutral",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  const t = useTranslations("PriorityBadge");
  return <Badge tone={TONE[priority]}>{t(priority)}</Badge>;
}
