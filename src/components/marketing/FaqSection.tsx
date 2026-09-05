import { Card, CardContent } from "@/components/ui/Card";
import { SectionKicker } from "@/components/marketing/SectionKicker";
import { PRICING_FAQ } from "@/lib/marketing/faq";

// `/`-only section (not used on any standalone route). Content = PRICING_FAQ
// (all 4 Q&As, imported not re-typed) under a general "Frequently asked
// questions" heading — deliberately NOT /faq's own 3-question list, since
// two of those three ("free plan," "switch tracks") are near-verbatim
// repeats of questions PRICING_FAQ already answers a few hundred pixels
// above on the same scroll. Closing line reused verbatim from
// /faq/page.tsx. No "See the full FAQ → /faq" link here (unlike
// PricingSection's own strip) — /faq's 3 questions are a strict subset of
// what's already shown here, so calling it "the full FAQ" from a section
// that already shows more would be misleading. See
// PRODUCT_SPECS_SCROLL_LANDING.md §4.
export function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-20 border-t border-border bg-background">
      <div className="mx-auto w-full max-w-6xl px-6 pb-24 pt-20 md:px-10 lg:px-16">
        <SectionKicker>FAQ</SectionKicker>
        <h2 className="mt-3 text-title-lg font-bold leading-tight tracking-tight text-foreground">
          Frequently asked questions
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {PRICING_FAQ.map((item) => (
            <Card key={item.q} variant="flat" className="transition-colors duration-200 hover:border-accent/30">
              <CardContent className="p-5">
                <p className="font-semibold text-foreground">{item.q}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          More questions? We&rsquo;re adding to this list. Reach out and we&rsquo;ll answer directly.
        </p>
      </div>
    </section>
  );
}
