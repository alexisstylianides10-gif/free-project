"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { mobileMoreNav, mobilePrimaryNav } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const moreActive = mobileMoreNav.some((i) => pathname.startsWith(i.href)) || pathname.startsWith("/settings");

  return (
    <>
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
              <item.icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.1 : 1.8} />
              {item.label}
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
              {mobileMoreNav.map((item) => (
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
                href="/settings"
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
