"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SectionKicker } from "@/components/marketing/SectionKicker";
import { branding } from "@/lib/branding";
import { cn } from "@/lib/utils";

// Extracted verbatim from about/page.tsx's body so the exact same JSX/copy
// renders on both the standalone /about route and inline on / — see
// PRODUCT_SPECS_SCROLL_LANDING.md §2, §7.

/**
 * `sectionBreak` (default `false`) — opts this section into the inline-on-/
 * treatment: a top `border-t border-border` plus a full-bleed `bg-surface`
 * band (About has no card grid/glow of its own, so a flat background shift
 * is the cleanest way to read it as its own zone). Standalone `/about`
 * renders with it omitted so it stays pixel-identical to the QA-signed-off
 * `ba9001d` version. Inner content stays the existing narrow `max-w-2xl`
 * centered column regardless — a deliberate width contrast against the
 * `max-w-6xl` grid sections around it when inline on `/`.
 *
 * `headingLevel` (default `"h1"`) — same opt-in-prop pattern as
 * `sectionBreak`/`withSectionBreak`. Standalone `/about` renders with it
 * omitted, so its main heading stays an `<h1>` (unchanged). Inline on `/`,
 * the Hero already owns the page's one `<h1>`, so `/` passes
 * `headingLevel="h2"` to avoid a second `<h1>` on the same document. The
 * three internal subheadings ("Why one app, two tracks", "What we actually
 * believe", "Who's behind it") demote from `<h2>` to `<h3>` in lockstep —
 * they must stay one level below whatever this section's main heading is, to
 * keep a valid, non-skipping hierarchy either way (QA-flagged, see
 * PROJECT_STATE.md "DEV FIX (scroll landing heading hierarchy)").
 */
export function AboutSection({
  sectionBreak = false,
  headingLevel = "h1",
}: {
  sectionBreak?: boolean;
  headingLevel?: "h1" | "h2";
}) {
  const t = useTranslations("AboutSection");
  const Heading = headingLevel;
  const SubHeading = headingLevel === "h2" ? "h3" : "h2";
  const link = (chunks: React.ReactNode, href: string) => (
    <Link href={href} className="font-semibold text-foreground underline underline-offset-4">
      {chunks}
    </Link>
  );
  return (
    <section
      id="about"
      className={cn("relative scroll-mt-20 overflow-hidden", sectionBreak && "border-t border-border bg-surface")}
    >
      <div className="relative mx-auto flex w-full max-w-2xl flex-col px-6 py-16 md:px-10 md:py-24">
        <SectionKicker>{t("kicker")}</SectionKicker>
        <Heading className="mt-3 text-title-lg font-bold tracking-tight text-foreground">{t("title")}</Heading>

        <div className="mt-4 space-y-4 text-body leading-relaxed text-muted-foreground">
          <p>{t("intro", { name: branding.name })}</p>

          <SubHeading className="!mt-8 text-body font-bold text-foreground">{t("whyOneAppTitle")}</SubHeading>
          <p>
            {t.rich("whyOneApp", {
              name: branding.name,
              faqLink: (chunks) => link(chunks, "/faq"),
            })}
          </p>

          <SubHeading className="!mt-8 text-body font-bold text-foreground">{t("whatWeBelieveTitle")}</SubHeading>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              {t.rich("belief1", {
                name: branding.name,
                strong: (chunks) => <strong className="font-semibold text-foreground">{chunks}</strong>,
                privacyLink: (chunks) => link(chunks, "/privacy"),
              })}
            </li>
            <li>
              {t.rich("belief2", {
                strong: (chunks) => <strong className="font-semibold text-foreground">{chunks}</strong>,
              })}
            </li>
            <li>
              {t.rich("belief3", {
                name: branding.name,
                strong: (chunks) => <strong className="font-semibold text-foreground">{chunks}</strong>,
              })}
            </li>
          </ul>

          <SubHeading className="!mt-8 text-body font-bold text-foreground">{t("whoWeAreTitle")}</SubHeading>
          <p>{t("whoWeAreBody", { name: branding.name })}</p>
          <p>{t("contactLine")}</p>
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/signup">
            <Button size="lg" className="w-full sm:w-auto">
              {t("getStarted")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/#features">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              {t("seeWhatItDoes")}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
