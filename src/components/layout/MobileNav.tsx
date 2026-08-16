"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "framer-motion";
import { Menu, Sparkles, X } from "lucide-react";
import { mobileMoreNav, mobilePrimaryNav, visibleNav } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useAlxioum } from "@/lib/store";

export function MobileNav() {
  const pathname = usePathname();
  const profile = useAlxioum((s) => s.profile);
  const [moreOpen, setMoreOpen] = useState(false);

  const moreNavItems = visibleNav(mobileMoreNav, profile?.plan);
  const moreActive = moreNavItems.some((i) => pathname.startsWith(i.href)) || pathname.startsWith("/app/settings");

  // Chat already has its own send button docked in this same bottom-right
  // corner — a second floating button there would sit on top of it and
  // steal taps meant for Send, so skip the FAB on that one route.
  const isChatRoute = pathname === "/app/chat";

  return (
    <>
      {!isChatRoute && (
        <button
          onClick={() => window.dispatchEvent(new Event("alxioum:open-command-palette"))}
          aria-label="Quick action — tell Alxioum what you need"
          className="fixed right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-pop transition-transform active:scale-95 md:hidden"
          style={{ bottom: "calc(4.75rem + env(safe-area-inset-bottom))" }}
        >
          <Sparkles className="h-5 w-5" />
        </button>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {mobilePrimaryNav.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10.5px] font-medium transition-colors",
                active ? "text-accent" : "text-muted-foreground"
              )}
            >
              <motion.span animate={{ scale: active ? 1.14 : 1, y: active ? -1 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}>
                <item.icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.1 : 1.8} />
              </motion.span>
              {item.label}
              {active && <motion.span layoutId="mobilenav-dot" className="h-1 w-1 rounded-full bg-accent" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10.5px] font-medium transition-colors",
            moreActive ? "text-accent" : "text-muted-foreground"
          )}
        >
          <Menu className="h-[21px] w-[21px]" strokeWidth={moreActive ? 2.1 : 1.8} />
          More
        </button>
      </nav>

      <Dialog.Root open={moreOpen} onOpenChange={setMoreOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-fade-in md:hidden" />
          <Dialog.Content className="fixed inset-x-0 bottom-0 z-40 rounded-t-2xl border-t border-border bg-surface p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-pop data-[state=open]:animate-fade-up md:hidden">
            <div className="mb-3 flex items-center justify-between">
              <Dialog.Title className="text-[15px] font-semibold">More</Dialog.Title>
              <Dialog.Close className="rounded-md p-1 text-muted-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {moreNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border py-4 text-[12.5px] font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <item.icon className="h-5 w-5 text-muted-foreground" />
                  {item.label}
                </Link>
              ))}
              <Link
                href="/app/settings"
                onClick={() => setMoreOpen(false)}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border py-4 text-[12.5px] font-medium text-foreground transition-colors hover:bg-muted"
              >
                <Menu className="h-5 w-5 text-muted-foreground" />
                Settings
              </Link>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
