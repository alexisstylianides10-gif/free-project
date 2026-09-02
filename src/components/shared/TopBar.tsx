"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, Moon, Monitor, type LucideIcon } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useTheme, type ThemeMode } from "@/components/providers/ThemeProvider";
import { STUDENT_TABS, BUSINESS_TABS } from "@/lib/navTabs";
import { Badge } from "@/components/ui/Badge";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { initials } from "@/lib/utils";
import { levelFromXP, totalXP } from "@/lib/xp";

const THEME_CYCLE: ThemeMode[] = ["system", "light", "dark"];
const THEME_ICON: Record<ThemeMode, LucideIcon> = { light: Sun, dark: Moon, system: Monitor };

/** Desktop/tablet-only header bar above the page content — gives md:+
 * screens a real app chrome (section title, theme control, identity) instead
 * of content just starting cold at the top of an empty page. Mobile keeps
 * its own in-page headers/greetings untouched. */
export function TopBar() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const { mode, setMode } = useTheme();

  if (!profile) return null;

  const TABS = profile.track === "business" ? BUSINESS_TABS : STUDENT_TABS;
  const activeTab = TABS.find((t) => t.match(pathname));
  const ThemeIcon = THEME_ICON[mode];
  const level = levelFromXP(totalXP(profile));

  function cycleTheme() {
    setMode(THEME_CYCLE[(THEME_CYCLE.indexOf(mode) + 1) % THEME_CYCLE.length]);
  }

  return (
    <header className="sticky top-0 z-30 hidden border-b border-border/60 bg-background/75 backdrop-blur-xl md:block">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-10 py-4 lg:max-w-5xl xl:max-w-6xl">
        <h1 className="text-base font-semibold tracking-tight text-foreground">{activeTab?.label ?? "Overview"}</h1>

        <div className="flex items-center gap-2">
          <NotificationBell />

          <button
            type="button"
            onClick={cycleTheme}
            aria-label={`Theme: ${mode}. Click to change.`}
            title={`Theme: ${mode}`}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground hover:rotate-12"
          >
            <ThemeIcon className="h-4 w-4" />
          </button>

          <Link
            href="/app/profile"
            className="group flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-muted"
          >
            <span className="relative flex h-7 w-7 shrink-0 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-gradient-brand opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-60" />
              <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-gradient-brand text-xs font-semibold text-white">
                {profile.avatar_emoji || initials(profile.full_name)}
              </span>
            </span>
            <span className="text-sm font-medium text-foreground">{profile.full_name?.split(" ")[0] || "You"}</span>
            <Badge tone="accent">Lvl {level}</Badge>
          </Link>
        </div>
      </div>
    </header>
  );
}
