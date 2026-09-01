import Link from "next/link";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import { LogoMark } from "@/components/shared/LogoMark";
import { Card, CardContent } from "@/components/ui/Card";
import { branding } from "@/lib/branding";

/**
 * Minimal shell for standalone, unauthenticated content pages reached from
 * the landing page footer (Privacy, Terms, FAQ).
 */
export function StaticContentPage({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  /** e.g. "September 1, 2026" — shown under the title when provided. */
  lastUpdated?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-background">
      <div className="mx-auto flex w-full max-w-2xl flex-col px-6 py-12 md:px-10 md:py-16">
        <Link href="/" className="flex w-fit items-center gap-2">
          <LogoMark size={32} className="shadow-glow-accent" />
          <span className="text-sm font-semibold tracking-wide text-muted-foreground">{branding.name}</span>
        </Link>

        <h1 className="mt-10 text-heading font-extrabold tracking-tight text-foreground">{title}</h1>
        {lastUpdated && <p className="mt-1 text-xs text-muted-foreground">Draft last updated: {lastUpdated}</p>}

        <div className="mt-4 space-y-4 text-body leading-relaxed text-muted-foreground">{children}</div>

        <Link
          href="/"
          className="mt-10 flex w-fit items-center gap-1.5 text-sm font-semibold text-foreground underline-offset-4 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </div>
    </main>
  );
}

/**
 * Un-missable "this is a draft, not final binding legal text" banner for the
 * Privacy Policy and Terms of Service pages specifically. This content was
 * drafted by the dev team (not a lawyer) as a genuinely substantive,
 * reasonable placeholder so the pages aren't dead stubs — but it has NOT had
 * real legal review and must not be presented as finished/binding. This
 * banner is the deliberate, visible-on-the-page flag for that, not just a
 * code comment nobody visiting the page would ever see.
 */
export function LegalDraftNotice() {
  return (
    <Card className="border border-warning/40 bg-warning-soft">
      <CardContent className="flex items-start gap-2.5 p-4 text-sm text-foreground">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <span>
          <strong className="font-semibold">Draft pending legal review.</strong> This page is a good-faith,
          substantive draft written to accurately describe how {branding.name} actually works today. It has not
          been reviewed by a lawyer and is not final, binding legal text. Do not rely on it as a complete legal
          document until it has been reviewed and this notice is removed.
        </span>
      </CardContent>
    </Card>
  );
}
