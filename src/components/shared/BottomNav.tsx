"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, GraduationCap, Target, Compass, TrendingUp, Sparkles, CircleUserRound } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils";

const STUDENT_TABS = [
  { href: "/app", label: "Home", icon: Home, match: (p: string) => p === "/app" },
  { href: "/app/school", label: "School", icon: GraduationCap, match: (p: string) => p.startsWith("/app/school") },
  { href: "/app/future", label: "Future", icon: Compass, match: (p: string) => p.startsWith("/app/future") },
  { href: "/app/coach", label: "Coach", icon: Sparkles, match: (p: string) => p.startsWith("/app/coach") },
  { href: "/app/profile", label: "Profile", icon: CircleUserRound, match: (p: string) => p.startsWith("/app/profile") },
];

const BUSINESS_TABS = [
  { href: "/app", label: "Home", icon: Home, match: (p: string) => p === "/app" },
  { href: "/app/school", label: "Plan", icon: Target, match: (p: string) => p.startsWith("/app/school") },
  { href: "/app/future", label: "Grow", icon: TrendingUp, match: (p: string) => p.startsWith("/app/future") },
  { href: "/app/coach", label: "Coach", icon: Sparkles, match: (p: string) => p.startsWith("/app/coach") },
  { href: "/app/profile", label: "Profile", icon: CircleUserRound, match: (p: string) => p.startsWith("/app/profile") },
];

export function BottomNav() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const TABS = profile?.track === "business" ? BUSINESS_TABS : STUDENT_TABS;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
      <div className="mx-auto flex max-w-md items-center justify-between gap-1 px-3">
        <div className="glass flex w-full items-center justify-between rounded-full px-1.5 py-1.5 shadow-pop">
          {TABS.map((tab) => {
            const active = tab.match(pathname);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 rounded-full py-2 text-[10px] font-medium transition-colors",
                  active ? "text-white" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full transition-all",
                    active && "bg-gradient-brand shadow-glow-accent"
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2.25} />
                </span>
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
