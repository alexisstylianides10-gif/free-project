"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import { Logo } from "./Logo";
import { primaryNav } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { useAlxioum } from "@/lib/store";

export function Sidebar() {
  const pathname = usePathname();
  const profile = useAlxioum((s) => s.profile);

  const navItems = primaryNav.filter((i) => i.label !== "Settings");
  const settingsItem = primaryNav.find((i) => i.label === "Settings")!;

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-surface md:flex">
      <Link href="/app/today" className="flex items-center gap-2.5 px-4 pb-3 pt-5">
        <Logo />
        <span className="text-[15px] font-semibold tracking-tight">Alxioum</span>
      </Link>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-3 pt-2">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-colors",
                active ? "bg-accent-soft text-accent" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-[17px] w-[17px]" strokeWidth={active ? 2.1 : 1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <Link
          href={settingsItem.href}
          className={cn(
            "mb-1 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-colors",
            pathname.startsWith(settingsItem.href) ? "bg-accent-soft text-accent" : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Settings className="h-[17px] w-[17px]" strokeWidth={pathname.startsWith(settingsItem.href) ? 2.1 : 1.8} />
          Settings
        </Link>
        <div className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5">
          <Avatar initials={profile?.avatarInitials ?? "U"} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-foreground">{profile?.name ?? "You"}</p>
            <p className="truncate text-[11.5px] text-muted-foreground">{profile?.plan ?? "Free"} plan</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
