import { daysBetween, todayISO } from "@/lib/utils";

export type DeadlineSource = "exam" | "homework" | "milestone";

export interface DeadlineItem {
  id: string;
  source: DeadlineSource;
  title: string; // exam: "{subject} Exam" · homework: subject · milestone: title
  subtitle?: string; // exam: title (if it differs from subject) · homework: title · milestone: description
  dueDate: string; // ISO date (YYYY-MM-DD) — always present; items without one never become a DeadlineItem
  href: string; // tap-through destination (the source list page — see §2)
}

export type UrgencyBucket = "overdue" | "today" | "this-week" | "later";

export const BUCKET_ORDER: UrgencyBucket[] = ["overdue", "today", "this-week", "later"];

export const BUCKET_LABEL: Record<UrgencyBucket, string> = {
  overdue: "Overdue",
  today: "Today",
  "this-week": "This week",
  later: "Later",
};

/** Overdue: due date before today. Today: due today. This week: due in the
 * next 1-7 days inclusive. Later: due in 8+ days. */
export function bucketForDate(dueDateISO: string, referenceTodayISO: string = todayISO()): UrgencyBucket {
  const diff = daysBetween(referenceTodayISO, dueDateISO);
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff <= 7) return "this-week";
  return "later";
}

/** Only ever danger/warning/success — the 3 urgency tones Badge already
 * supports, per Cato's brief. Overdue and Today share "danger" (both need
 * action now); This week is "warning"; Later is "success" (nothing urgent
 * yet — reads as "you're fine," consistent with how BusinessGrowHome's
 * trend badge already uses success for a good state, not just "done"). */
export function badgeToneForBucket(bucket: UrgencyBucket): "danger" | "warning" | "success" {
  if (bucket === "overdue" || bucket === "today") return "danger";
  if (bucket === "this-week") return "warning";
  return "success";
}

export interface DeadlineGroup {
  bucket: UrgencyBucket;
  label: string;
  items: DeadlineItem[];
}

/** Groups + sorts a flat list of DeadlineItems into the 4 urgency buckets,
 * soonest-first within each bucket. Buckets with zero items are omitted
 * entirely — the page never renders an "Overdue" heading with nothing
 * under it. */
export function groupDeadlines(items: DeadlineItem[]): DeadlineGroup[] {
  const sorted = [...items].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return BUCKET_ORDER.map((bucket) => ({
    bucket,
    label: BUCKET_LABEL[bucket],
    items: sorted.filter((item) => bucketForDate(item.dueDate) === bucket),
  })).filter((group) => group.items.length > 0);
}
