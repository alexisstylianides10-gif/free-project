"use client";

import Link from "next/link";
import * as Popover from "@radix-ui/react-popover";
import { motion } from "framer-motion";
import { Bell, Flame, Search } from "lucide-react";
import { Logo } from "./Logo";
import { useAlxioum } from "@/lib/store";
import { cn } from "@/lib/utils";
import { formatDayLabel } from "@/lib/utils";
import { dayStreak } from "@/lib/study/stats";

export function TopBar() {
  const notifications = useAlxioum((s) => s.notifications);
  const markRead = useAlxioum((s) => s.markNotificationRead);
  const profile = useAlxioum((s) => s.profile);
  const focusSessions = useAlxioum((s) => s.focusSessions);
  const unread = notifications.filter((n) => !n.read).length;
  const showStreak = profile?.plan === "Student";
  const streak = showStreak ? dayStreak(focusSessions) : 0;

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-surface/85 px-4 backdrop-blur md:justify-end md:border-none md:bg-transparent md:px-6">
      <Link href="/app/today" className="flex items-center gap-2 md:hidden">
        <Logo />
        <span className="text-[15px] font-semibold tracking-tight">Alxioum</span>
      </Link>

      <div className="flex items-center gap-1.5">
        {showStreak && (
          <Link
            href="/app/study"
            className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <Flame className={cn("h-3.5 w-3.5", streak > 0 ? "text-orange-500" : "text-muted-foreground")} />
            {streak}
          </Link>
        )}
        <button
          onClick={() => window.dispatchEvent(new Event("alxioum:open-command-palette"))}
          className="hidden items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-[12.5px] text-muted-foreground transition-colors hover:bg-muted md:flex"
          aria-label="Open command palette"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Quick jump</span>
          <kbd className="rounded border border-border bg-muted/60 px-1 py-0.5 text-[10px]">⌘K</kbd>
        </button>
        <Popover.Root>
          <Popover.Trigger asChild>
            <button
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
              aria-label="Notifications"
            >
              <Bell className="h-[18px] w-[18px]" />
              {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                  <motion.span
                    className="absolute inline-flex h-full w-full rounded-full bg-danger"
                    animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                  />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-danger ring-2 ring-surface" />
                </span>
              )}
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content align="end" sideOffset={10} className="z-50 w-80 rounded-xl border border-border bg-surface p-2 shadow-pop animate-scale-in">
              <p className="px-2.5 py-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Notifications</p>
              {notifications.length === 0 && <p className="px-2.5 py-6 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>}
              <div className="max-h-80 space-y-0.5 overflow-y-auto">
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={cn(
                      "flex w-full flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted",
                      !n.read && "bg-accent-soft/40"
                    )}
                  >
                    <div className="flex w-full items-center gap-2">
                      {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                      <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">{n.title}</p>
                    </div>
                    <p className="text-[12px] text-muted-foreground">{n.body}</p>
                    <p className="text-[11px] text-muted-foreground/70">{formatDayLabel(n.createdAt.slice(0, 10))}</p>
                  </button>
                ))}
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
    </header>
  );
}
