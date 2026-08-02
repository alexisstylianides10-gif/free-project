"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Plus, Settings, ChevronsUpDown } from "lucide-react";
import { Logo } from "./Logo";
import { primaryNav } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { useTriply } from "@/lib/store";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const profile = useTriply((s) => s.profile);
  const allTrips = useTriply((s) => s.trips);
  const trips = allTrips.filter((t) => !t.archived);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-surface md:flex">
      <div className="flex items-center gap-2.5 px-4 pb-3 pt-5">
        <Logo />
        <span className="text-[15px] font-semibold tracking-tight">Triply</span>
      </div>

      <nav className="space-y-0.5 px-3 pb-2">
        {primaryNav.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
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

      <div className="mt-2 flex-1 overflow-y-auto px-3 pb-3">
        <div className="flex items-center justify-between px-2.5 py-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Your trips</span>
          <button
            onClick={() => router.push("/trips/create")}
            aria-label="Create trip"
            className="flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="space-y-0.5">
          {trips.map((t) => (
            <Link
              key={t.id}
              href={`/trip?tripId=${t.id}`}
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <span className="text-[15px] leading-none">{t.countryFlag}</span>
              <span className="truncate">{t.name}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="border-t border-border p-3">
        <Link
          href="/profile"
          className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-muted"
        >
          <Avatar initials={profile.avatarInitials} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-foreground">{profile.name}</p>
            <p className="truncate text-[11.5px] text-muted-foreground">{profile.plan === "Travel Pro" ? "Travel Pro" : "Free plan"}</p>
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          <Settings className="hidden h-3.5 w-3.5 text-muted-foreground" />
        </Link>
      </div>
    </aside>
  );
}
