"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { LogoMark } from "@/components/shared/LogoMark";
import { Button } from "@/components/ui/Button";
import { branding } from "@/lib/branding";
import { cn } from "@/lib/utils";

// Hrefs point at the merged sections on the scrolling / page (§3), not the
// standalone routes — Next.js App Router's <Link> already handles both
// "navigate to / then scroll" (clicked from another page) and "scroll in
// place" (already on /) natively for /#section hrefs, no scroll-spy library
// needed. See PRODUCT_SPECS_SCROLL_LANDING.md §3.
const LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#about", label: "About" },
  { href: "/#faq", label: "FAQ" },
];

/** Sticky top nav for the marketing pages only (/, /features, /pricing,
 * /about) — deliberately NOT rendered on /faq, /privacy, /terms, or any
 * auth/onboarding screen; those keep their existing minimal chrome on
 * purpose (see PRODUCT_SPECS_MARKETING_SITE.md §2a for why). Sticky-bar
 * classes mirror TopBar.tsx's own so in-app and marketing chrome feel like
 * the same product, not two different skins.
 *
 * `hideLogoOnMobile` — QA fix (2026-09-02): `/` already renders its own
 * mobile-only logo row (`md:hidden`) in its hero. Spec §2a's reference code
 * renders MarketingNav's logo unconditionally, which — combined with the
 * hero's own mobile logo — produced two stacked logos on `/` at mobile
 * widths (confirmed by rendering the page). `/` passes this prop so its nav
 * logo only appears at `md:`+, where the hero's own mobile logo has already
 * disappeared (matching spec §3a's original "mobile completely unaffected"
 * intent). `/features`, `/pricing`, and `/about` have no other mobile brand
 * mark, so they must NOT pass this prop — MarketingNav's logo is their only
 * mobile branding and losing it there would be a worse regression than the
 * duplicate-logo bug this fixes. */
export function MarketingNav({ hideLogoOnMobile = false }: { hideLogoOnMobile?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5 md:px-10 lg:px-16">
        <Link href="/" className={cn("items-center gap-2", hideLogoOnMobile ? "hidden md:flex" : "flex")}>
          <LogoMark size={28} />
          <span className="text-sm font-semibold tracking-wide text-foreground">{branding.name}</span>
        </Link>

        {/* md:+ full link row */}
        <nav className="hidden items-center gap-7 md:flex">
          {/* Active-link underline dropped (2026-09-02, scroll-landing
              restructure): now that every href is /#section, pathname never
              includes a hash fragment, so `pathname === l.href` would always
              be false — a silent "every link looks inactive forever" bug, not
              a working active-state. A correct fix needs an
              IntersectionObserver scroll-spy, which is new interaction
              complexity out of scope here; see
              PRODUCT_SPECS_SCROLL_LANDING.md §3 for the reasoning. Links
              render as text-muted-foreground always, matching their existing
              "not the active page" look, with hover:text-foreground doing
              the only state work. */}
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="group relative text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
              <span className="absolute inset-x-0 -bottom-1 h-px scale-x-0 bg-gradient-brand transition-transform duration-200 group-hover:scale-x-100" />
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
