"use client";

import Link from "next/link";
import * as Popover from "@radix-ui/react-popover";
import { Bell } from "lucide-react";
import { Logo } from "./Logo";
import { useAlxioum } from "@/lib/store";
import { cn } from "@/lib/utils";
import { formatDayLabel } from "@/lib/utils";

export function TopBar() {
  const notifications = useAlxioum((s) => s.notifications);
  const markRead = useAlxioum((s) => s.markNotificationRead);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-surface/85 px-4 backdrop-blur md:justify-end md:border-none md:bg-transparent md:px-6">
      <Link href="/app/today" className="flex items-center gap-2 md:hidden">
        <Logo />
        <span className="text-[15px] font-semibold tracking-tight">Alxioum</span>
      </Link>

      <div className="flex items-center gap-1.5">
        <Popover.Root>
          <Popover.Trigger asChild>
            <button
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
              aria-label="Notifications"
            >
              <Bell className="h-[18px] w-[18px]" />
              {unread > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger ring-2 ring-surface" />}
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
                      <p className="flex-1 truncate text-[13px] font-medium text-foreground">{n.title}</p>
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
