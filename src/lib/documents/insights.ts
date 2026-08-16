import { differenceInCalendarDays } from "date-fns";
import { Document, DocumentDate } from "@/lib/types";

export interface DocumentInsight {
  id: string;
  text: string;
}

/**
 * Rule-based, minimum-data-gated observations — never fabricated from thin
 * data. Each rule only fires once there's genuinely enough signal to be
 * worth surfacing; an empty library or a handful of documents produces no
 * insights rather than a stretched one.
 */
export function computeDocumentInsights(documents: Document[], dates: DocumentDate[], today: Date = new Date()): DocumentInsight[] {
  const insights: DocumentInsight[] = [];
  const ready = documents.filter((d) => d.processingStatus === "ready");

  const upcoming = dates.filter((d) => {
    const diff = differenceInCalendarDays(new Date(d.date), today);
    return diff >= 0 && diff <= 7;
  });
  if (upcoming.length >= 2) {
    insights.push({ id: "upcoming-deadlines", text: `You have ${upcoming.length} dates or deadlines from your documents coming up in the next 7 days.` });
  }

  if (ready.length >= 5) {
    const uncategorized = ready.filter((d) => !d.category).length;
    if (uncategorized >= 3) {
      insights.push({ id: "uncategorized", text: `${uncategorized} documents don't have a category yet — sorting them makes them easier to find later.` });
    }
  }

  const categorized = ready.filter((d) => d.category);
  if (categorized.length >= 3) {
    const counts = new Map<string, number>();
    for (const d of categorized) counts.set(d.category!, (counts.get(d.category!) ?? 0) + 1);
    const [topCategory, topCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topCount / categorized.length >= 0.5) {
      insights.push({ id: "top-category", text: `Most of your documents (${topCount}) are in "${topCategory}".` });
    }
  }

  return insights.slice(0, 3);
}
