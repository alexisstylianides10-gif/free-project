"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Plus,
  CalendarPlus,
  MessageCircle,
  Search,
  Settings,
  ChevronsUpDown,
} from "lucide-react";
import { Logo } from "./Logo";
import { primaryNav } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { useAlxioum } from "@/lib/store";

export function Sidebar() {
  const pathname = usePathname();
  const profile = useAlxioum((s) => s.profile);
  const setCommandOpen = useAlxioum((s) => s.setCommandOpen);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-surface md:flex">
      <Link href="/app" className="flex items-center gap-2.5 px-4 pb-3 pt-5">
        <Logo />
        <span className="text-[15px] font-semibold tracking-tight">Alxioum</span>
      </Link>

      <button
        onClick={() => setCommandOpen(true)}
        className="mx-3 mb-4 flex items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 py-2 text-left text-[13px] text-muted-foreground transition-colors hover:bg-muted"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1">Search Alxioum...</span>
        <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
      </button>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
        {primaryNav.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-colors",
                active
                  ? "bg-accent-soft text-accent"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-[17px] w-[17px]" strokeWidth={active ? 2.1 : 1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-[13.5px] font-semibold text-accent-foreground transition-opacity hover:opacity-90">
              <Plus className="h-4 w-4" /> New
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              side="top"
              align="start"
              sideOffset={8}
              className="z-50 w-56 rounded-xl border border-border bg-surface p-1.5 shadow-pop animate-scale-in"
            >
              <QuickAddMenuItem icon={CalendarPlus} label="New calendar event" href="/calendar" />
              <QuickAddMenuItem icon={MessageCircle} label="Ask Alxioum" href="/app" />
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        <Link
          href="/settings"
          className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-muted"
        >
          <Avatar initials={profile.avatarInitials} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-foreground">{profile.name}</p>
            <p className="truncate text-[11.5px] text-muted-foreground">{profile.plan} plan</p>
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          <Settings className="hidden h-3.5 w-3.5 text-muted-foreground" />
        </Link>
      </div>
    </aside>
  );
}

function QuickAddMenuItem({
  icon: Icon,
  label,
  onSelect,
  href,
}: {
  icon: typeof Plus;
  label: string;
  onSelect?: () => void;
  href?: string;
}) {
  const content = (
    <>
      <Icon className="h-4 w-4 text-muted-foreground" />
      {label}
    </>
  );
  if (href) {
    return (
      <DropdownMenu.Item asChild className="outline-none">
        <Link href={href} className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-muted">
          {content}
        </Link>
      </DropdownMenu.Item>
    );
  }
  return (
    <DropdownMenu.Item
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium text-foreground outline-none transition-colors hover:bg-muted"
    >
      {content}
    </DropdownMenu.Item>
  );
}
