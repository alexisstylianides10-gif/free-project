import { daysBetween } from "@/lib/utils";
import type { Exam, Homework, BusinessMilestone, NotificationType } from "@/lib/types";

export interface NotificationItem {
  id: string; // real notifications.id, or a synthetic `deadline-{source}-{entityId}` for computed items
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  read: boolean;
  createdAt: string;
  dismissible: boolean; // true = computed deadline item (dismiss writes a suppression row); false = stored event row (marks read)
  relatedId?: string;
}

/** Narrower than the full Deadlines page on purpose — Notifications is meant
 * to surface what's actually urgent, not duplicate Deadlines' full list.
 * Window: overdue by up to 3 days, or due within the next 3 days. */
const WINDOW_DAYS = 3;

function inWindow(dueDateISO: string, todayISO: string): boolean {
  const diff = daysBetween(todayISO, dueDateISO);
  return diff >= -WINDOW_DAYS && diff <= WINDOW_DAYS;
}

/** `labels` lets callers (NotificationBell) supply translated copy for the
 * two English-formatted strings this builder used to hard-code ("Due {date}"
 * / "{subject} Exam"). Defaults keep this usable from anywhere that hasn't
 * threaded a translator through (e.g. tests). */
export function buildDeadlineNotifications(params: {
  exams: Exam[];
  homework: Homework[];
  milestones: BusinessMilestone[];
  isBusiness: boolean;
  dismissedIds: Set<string>; // synthetic ids already suppressed via a stored deadline_* row
  today: string;
  labels?: { due: (date: string) => string; examTitle: (subject: string) => string };
}): NotificationItem[] {
  const { exams, homework, milestones, isBusiness, dismissedIds, today } = params;
  const labels = params.labels ?? { due: (date: string) => `Due ${date}`, examTitle: (subject: string) => `${subject} Exam` };
  const items: NotificationItem[] = [];

  if (isBusiness) {
    for (const m of milestones) {
      if (!m.due_date || m.status === "done" || !inWindow(m.due_date, today)) continue;
      const id = `deadline-milestone-${m.id}`;
      if (dismissedIds.has(id)) continue;
      items.push({ id, type: "deadline_milestone", title: m.title, body: labels.due(m.due_date), href: "/app/school", read: false, createdAt: today, dismissible: true, relatedId: m.id });
    }
  } else {
    for (const e of exams) {
      if (!inWindow(e.exam_date, today)) continue;
      const id = `deadline-exam-${e.id}`;
      if (dismissedIds.has(id)) continue;
      items.push({ id, type: "deadline_exam", title: labels.examTitle(e.subject), body: labels.due(e.exam_date), href: "/app/school/exams", read: false, createdAt: today, dismissible: true, relatedId: e.id });
    }
    for (const h of homework) {
      if (h.status !== "pending" || !inWindow(h.due_date, today)) continue;
      const id = `deadline-homework-${h.id}`;
      if (dismissedIds.has(id)) continue;
      items.push({ id, type: "deadline_homework", title: h.subject, body: h.title, href: "/app/school", read: false, createdAt: today, dismissible: true, relatedId: h.id });
    }
  }
  return items;
}
