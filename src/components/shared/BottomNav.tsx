"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { STUDENT_TABS, BUSINESS_TABS } from "@/lib/navTabs";
import { cn } from "@/lib/utils";

/** Mobile-only tab bar — hidden from md: up, where SidebarNav takes over. */
export function BottomNav() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const TABS = profile?.track === "business" ? BUSINESS_TABS : STUDENT_TABS;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 md:hidden">
      <div className="mx-auto flex max-w-md items-center justify-between gap-1 px-3">
        {/* Persistent floating nav chrome — the one nav-shell element that
            legitimately warrants the "elevated" shadow tier (spec §10). No
            blur/translucency (glassmorphism retired, spec §12): a plain
            bordered surface reads just as "floating" without it. */}
        <div className="flex w-full items-center justify-between rounded-full border border-border bg-surface px-1.5 py-1.5 shadow-raised">
          {TABS.map((tab) => {
            const active = tab.match(pathname);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  // Spec §8: subtle brand-tinted background + brand-colored
                  // icon/text for the active state, not a solid white-on-
                  // block treatment.
                  "flex flex-1 flex-col items-center gap-0.5 rounded-full py-2 text-2xs font-medium transition-colors",
                  active ? "text-accent" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                    active && "bg-accent-soft"
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
