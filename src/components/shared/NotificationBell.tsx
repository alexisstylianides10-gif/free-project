"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Trophy, Compass, CalendarClock, type LucideIcon } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useExams, useHomework, useBusinessMilestones } from "@/lib/hooks/domain";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { buildDeadlineNotifications, type NotificationItem } from "@/lib/notifications";
import { ACHIEVEMENT_UNLOCKED_EVENT } from "@/lib/actions/achievements";
import { ROADMAP_LEVEL_UP_EVENT } from "@/lib/actions/roadmap";
import { todayISO, cn } from "@/lib/utils";
import type { NotificationType } from "@/lib/types";

const TYPE_ICON: Record<NotificationType, LucideIcon> = {
  achievement_unlocked: Trophy,
  roadmap_level_up: Compass,
  deadline_exam: CalendarClock,
  deadline_homework: CalendarClock,
  deadline_milestone: CalendarClock,
};

export function NotificationBell({ className }: { className?: string } = {}) {
  const { user, profile } = useAuth();
  const isBusiness = profile?.track === "business";
  const [open, setOpen] = useState(false);

  const { data: exams } = useExams(isBusiness ? undefined : user?.id);
  const { data: homework } = useHomework(isBusiness ? undefined : user?.id);
  const { data: milestones } = useBusinessMilestones(isBusiness ? user?.id : undefined);
  const { data: stored, refetch, markRead, markAllRead, dismissDeadline } = useNotifications(user?.id);

  useEffect(() => {
    function onEvent() {
      refetch();
    }
    window.addEventListener(ACHIEVEMENT_UNLOCKED_EVENT, onEvent);
    window.addEventListener(ROADMAP_LEVEL_UP_EVENT, onEvent);
    return () => {
      window.removeEventListener(ACHIEVEMENT_UNLOCKED_EVENT, onEvent);
      window.removeEventListener(ROADMAP_LEVEL_UP_EVENT, onEvent);
    };
  }, [refetch]);

  const dismissedIds = useMemo(
    () => new Set(stored.filter((r) => r.type.startsWith("deadline_")).map((r) => `deadline-${r.type.replace("deadline_", "")}-${r.related_id}`)),
    [stored]
  );

  const items: NotificationItem[] = useMemo(() => {
    const deadlineItems = buildDeadlineNotifications({ exams, homework, milestones, isBusiness, dismissedIds, today: todayISO() });
    const eventItems: NotificationItem[] = stored
      .filter((r) => r.type === "achievement_unlocked" || r.type === "roadmap_level_up")
      .map((r) => ({ id: r.id, type: r.type, title: r.title, body: r.body, href: r.href ?? "/app", read: r.read, createdAt: r.created_at, dismissible: false }));
    return [...deadlineItems, ...eventItems].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [stored, exams, homework, milestones, isBusiness, dismissedIds]);

  const unreadCount = items.filter((i) => !i.read).length;

  // Synthetic ids look like `deadline-{source}-{entityId}`, and `entityId` is
  // a real Postgres uuid, which itself contains dashes (e.g.
  // `deadline-milestone-4a1b2c3d-5678-90ab-cdef-1234567890ab`). A plain
  // `id.split("-")` destructure would only grab the uuid's first hyphen
  // segment, silently truncating relatedId and breaking suppression on the
  // next `buildDeadlineNotifications` call (its freshly-computed id would
  // never match a dismissedIds entry built from a truncated relatedId). Only
  // the first two segments (`deadline`, `source`) are fixed-width; `source`
  // itself is never hyphenated ("exam" | "homework" | "milestone"), so the
  // remaining segments must be rejoined to recover the full uuid.
  function parseDeadlineId(id: string): { type: "deadline_exam" | "deadline_homework" | "deadline_milestone"; relatedId: string } {
    const parts = id.split("-");
    const source = parts[1];
    const relatedId = parts.slice(2).join("-");
    return { type: `deadline_${source}` as "deadline_exam" | "deadline_homework" | "deadline_milestone", relatedId };
  }

  async function handleItemClick(item: NotificationItem) {
    if (item.dismissible) {
      const { type, relatedId } = parseDeadlineId(item.id);
      if (user) await dismissDeadline(user.id, type, relatedId);
    } else {
      await markRead(item.id);
    }
    setOpen(false);
  }

  async function handleMarkAllRead() {
    if (!user) return;
    const storedUnreadIds = stored.filter((r) => !r.read && (r.type === "achievement_unlocked" || r.type === "roadmap_level_up")).map((r) => r.id);
    await markAllRead(storedUnreadIds);
    for (const item of items.filter((i) => i.dismissible)) {
      const { type, relatedId } = parseDeadlineId(item.id);
      await dismissDeadline(user.id, type, relatedId);
    }
  }

  if (!user) return null;

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="glass absolute right-0 top-11 z-50 w-80 max-h-96 overflow-y-auto rounded-2xl p-2 shadow-raised">
          <div className="flex items-center justify-between px-2 py-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notifications</p>
            {unreadCount > 0 && (
              <button type="button" onClick={handleMarkAllRead} className="flex items-center gap-1 text-xs font-semibold text-accent">
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="p-4 text-center text-xs text-muted-foreground">You&apos;re all caught up.</p>
          ) : (
            items.map((item) => {
              const Icon = TYPE_ICON[item.type];
              return (
                <Link key={item.id} href={item.href} onClick={() => handleItemClick(item)} className={cn("flex items-start gap-2.5 rounded-xl p-2.5 transition-colors hover:bg-muted", !item.read && "bg-accent-soft/50")}>
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.body}</p>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
