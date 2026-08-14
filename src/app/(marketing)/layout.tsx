import Link from "next/link";
import { Logo } from "@/components/layout/Logo";

const footerLinks = {
  Product: [
    { label: "How it works", href: "/#how-it-works" },
    { label: "Pricing", href: "/pricing" },
    { label: "Agents", href: "/#agents" },
  ],
  Company: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "Cookies", href: "/cookies" },
  ],
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo />
            <span className="text-[16px] font-semibold tracking-tight text-foreground">Alxioum</span>
          </Link>
          <nav className="hidden items-center gap-7 text-[13.5px] font-medium text-muted-foreground md:flex">
            <Link href="/#how-it-works" className="transition-colors hover:text-foreground">
              How it works
            </Link>
            <Link href="/#agents" className="transition-colors hover:text-foreground">
              Agents
            </Link>
            <Link href="/pricing" className="transition-colors hover:text-foreground">
              Pricing
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-lg bg-accent px-3.5 py-2 text-[13.5px] font-semibold text-accent-foreground transition-opacity hover:opacity-90">
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-5 py-12">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-[2fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-2.5">
                <Logo />
                <span className="text-[15px] font-semibold tracking-tight text-foreground">Alxioum</span>
              </div>
              <p className="mt-3 max-w-xs text-[13px] text-muted-foreground">Your personal AI command center that acts on your behalf — with permission at every step.</p>
            </div>
            {Object.entries(footerLinks).map(([heading, links]) => (
              <div key={heading}>
                <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">{heading}</p>
                <ul className="mt-3 space-y-2">
                  {links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="text-[13.5px] text-muted-foreground transition-colors hover:text-foreground">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-10 text-[12px] text-muted-foreground/70">© {new Date().getFullYear()} Alxioum. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
