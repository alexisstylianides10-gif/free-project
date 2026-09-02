"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { LogoMark } from "@/components/shared/LogoMark";
import { Button } from "@/components/ui/Button";
import { branding } from "@/lib/branding";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
];

/** Sticky top nav for the marketing pages only (/, /features, /pricing,
 * /about) — deliberately NOT rendered on /faq, /privacy, /terms, or any
 * auth/onboarding screen; those keep their existing minimal chrome on
 * purpose (see PRODUCT_SPECS_MARKETING_SITE.md §2a for why). Sticky-bar
 * classes mirror TopBar.tsx's own so in-app and marketing chrome feel like
 * the same product, not two different skins. */
export function MarketingNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5 md:px-10 lg:px-16">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark size={28} />
          <span className="text-sm font-semibold tracking-wide text-foreground">{branding.name}</span>
        </Link>

        {/* md:+ full link row */}
        <nav className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-foreground",
                pathname === l.href ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Link href="/login" className="px-3 text-sm font-semibold text-muted-foreground hover:text-foreground">
            Log in
          </Link>
          <Link href="/signup">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>

        {/* below md: compact toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex h-9 w-9 items-center justify-center rounded-full text-foreground md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="glass mx-4 mb-4 space-y-1 rounded-2xl p-2 shadow-raised md:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              {l.label}
            </Link>
          ))}
          <div className="flex items-center gap-2 border-t border-border pt-2">
            <Link href="/login" onClick={() => setOpen(false)} className="flex-1">
              <Button variant="secondary" size="md" className="w-full">Log in</Button>
            </Link>
            <Link href="/signup" onClick={() => setOpen(false)} className="flex-1">
              <Button size="md" className="w-full">Get Started</Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
