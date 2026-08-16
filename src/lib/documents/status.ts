import { differenceInCalendarDays } from "date-fns";
import { Document, DocumentDate } from "@/lib/types";

export interface NeedsAttentionReason {
  kind: "deadline_soon" | "deadline_overdue" | "processing_error" | "needs_review";
  label: string;
}

/**
 * Always computed fresh from real signals — never stored, never AI-assigned.
 * Mirrors goals/status.ts's persisted-vs-derived split: processingStatus is
 * real pipeline state, this is a pure function of it plus real dates.
 */
export function computeNeedsAttentionReasons(doc: Document, dates: DocumentDate[], today: Date = new Date()): NeedsAttentionReason[] {
  const reasons: NeedsAttentionReason[] = [];

  if (doc.processingStatus === "error") {
    reasons.push({ kind: "processing_error", label: doc.processingError || "Couldn't analyze this document." });
  }
  if (doc.processingStatus === "needs_review") {
    reasons.push({ kind: "needs_review", label: "This document needs a quick review." });
  }

  for (const d of dates.filter((d) => d.documentId === doc.id)) {
    const diff = differenceInCalendarDays(new Date(d.date), today);
    if (diff < 0) {
      reasons.push({ kind: "deadline_overdue", label: `${d.label} was due ${Math.abs(diff)} day${Math.abs(diff) === 1 ? "" : "s"} ago` });
    } else if (diff <= 3) {
      reasons.push({ kind: "deadline_soon", label: `${d.label} in ${diff} day${diff === 1 ? "" : "s"}` });
    }
  }

  return reasons;
}

export function computeNeedsAttention(doc: Document, dates: DocumentDate[], today: Date = new Date()): boolean {
  return computeNeedsAttentionReasons(doc, dates, today).length > 0;
}
