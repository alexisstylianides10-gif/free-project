"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { STUDENT_TABS, BUSINESS_TABS } from "@/lib/navTabs";
import { LogoMark } from "@/components/shared/LogoMark";
import { cn } from "@/lib/utils";
import { branding } from "@/lib/branding";

/** Tablet/desktop-only sidebar — hidden below md:, where BottomNav takes
 * over. Same tab data/routes as BottomNav, just a different presentation. */
export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const TABS = profile?.track === "business" ? BUSINESS_TABS : STUDENT_TABS;

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  return (
    <aside className="sticky top-0 z-20 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-surface/70 px-4 py-6 backdrop-blur-xl md:flex lg:w-64">
      <Link href="/app" className="group flex items-center gap-2.5 px-2">
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-gradient-brand opacity-40 blur-md transition-opacity duration-300 group-hover:opacity-70" />
          <LogoMark size={32} className="relative" />
        </span>
        <span className="text-base font-bold tracking-tight text-foreground">{branding.name}</span>
      </Link>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-gradient-brand text-white shadow-glow-accent"
                  : "text-muted-foreground hover:translate-x-0.5 hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={2.25} />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={handleSignOut}
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <LogOut className="h-[18px] w-[18px]" strokeWidth={2.25} />
        Sign out
      </button>
    </aside>
  );
}
