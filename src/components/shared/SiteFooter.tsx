import Link from "next/link";
import { LogoMark } from "@/components/shared/LogoMark";
import { branding } from "@/lib/branding";

// Features/Pricing/About/FAQ now point at the merged sections on the
// scrolling / page (§3) instead of the standalone routes; Privacy/Terms are
// real, unaffected routes — never candidates for merging (legal pages, not
// marketing content). See PRODUCT_SPECS_SCROLL_LANDING.md §1, §3.
const FOOTER_LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#about", label: "About" },
  { href: "/#faq", label: "FAQ" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

/** Shared footer for every public marketing page (/, /features, /pricing,
 * /about). Extracted from the footer that used to be inlined only in
 * page.tsx (lines 129-152 pre-extraction) — same markup, same classes,
 * now with /features, /pricing, /about added ahead of the existing
 * Privacy/Terms/FAQ order. Not used on /faq, /privacy, /terms — those keep
 * StaticContentPage's own minimal "Back to home" footer treatment. */
export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-border px-6 py-8 md:px-10 lg:px-16 xl:px-20">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-5 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-2">
          <LogoMark size={20} />
          <span className="text-sm font-semibold text-muted-foreground">{branding.name}</span>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {FOOTER_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="transition-colors hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>

        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} {branding.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
