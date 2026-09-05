"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { STUDENT_TABS, BUSINESS_TABS } from "@/lib/navTabs";
import { Badge } from "@/components/ui/Badge";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { initials } from "@/lib/utils";
import { levelFromXP, totalXP } from "@/lib/xp";

/** Desktop/tablet-only header bar above the page content — gives md:+
 * screens a real app chrome (section title, theme control, identity) instead
 * of content just starting cold at the top of an empty page. Mobile keeps
 * its own in-page headers/greetings untouched. */
export function TopBar() {
  const pathname = usePathname();
  const { profile } = useAuth();

  if (!profile) return null;

  const TABS = profile.track === "business" ? BUSINESS_TABS : STUDENT_TABS;
  const activeTab = TABS.find((t) => t.match(pathname));
  const level = levelFromXP(totalXP(profile));

  return (
    <header className="sticky top-0 z-30 hidden border-b border-border bg-background md:block">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-10 py-4 lg:max-w-5xl xl:max-w-6xl">
        <h1 className="text-base font-semibold tracking-tight text-foreground">{activeTab?.label ?? "Overview"}</h1>

        <div className="flex items-center gap-2">
          <NotificationBell />

          <ThemeToggle variant="compact" />

          <Link
            href="/app/profile"
            className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-muted"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
              {profile.avatar_emoji || initials(profile.full_name)}
            </span>
            <span className="text-sm font-medium text-foreground">{profile.full_name?.split(" ")[0] || "You"}</span>
            <Badge tone="accent">Lvl {level}</Badge>
          </Link>
        </div>
      </div>
    </header>
  );
}
