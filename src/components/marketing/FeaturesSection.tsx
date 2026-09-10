"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Brain,
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  Compass,
  Flame,
  Layers,
  MapPin,
  Receipt,
  Sparkles,
  Target,
  TrendingUp,
  TriangleAlert,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SectionKicker } from "@/components/marketing/SectionKicker";
import { cn } from "@/lib/utils";

// Extracted verbatim from features/page.tsx's body (eyebrow through closing
// CTA) so the exact same JSX/copy renders on both the standalone /features
// route and inline on / — see PRODUCT_SPECS_SCROLL_LANDING.md §2, §7.

// `id` is a stable, English-only key into the "FeaturesSection" i18n
// namespace's `student.*`/`business.*` title/description pairs — the
// English `title` below is only used as a lookup key for
// STUDENT_HEADLINE_TITLES/BUSINESS_HEADLINE_TITLES (which item gets the
// larger "headline" card treatment), never rendered directly once `t()` is
// wired in below.
type FeatureCard = { id: string; icon: LucideIcon; title: string };

// Shared hover-lift micro-interaction — same recipe already used for
// interactive cards on the in-app dashboards (StudentHome/BusinessHome's
// own local HOVER_LIFT), reused here rather than invented fresh so cards
// across the product share one physical "lift" language. Hover shadow
// dialed back from shadow-float (the heaviest, multi-layer token) to
// shadow-raised — these cards now rest on the flat Card variant's single
// shadow-subtle, so the hover state only needs to read as "slightly more
// elevated," not jump straight to the app's heaviest floating-panel shadow.
const HOVER_LIFT =
  "transition-all duration-200 hover:-translate-y-1 hover:border-accent/40 hover:shadow-raised";

const STUDENT_FEATURES: FeatureCard[] = [
  { id: "timetable", icon: CalendarClock, title: "Timetable" },
  { id: "homeworkTracking", icon: ClipboardCheck, title: "Homework tracking" },
  { id: "examsReadiness", icon: Target, title: "Exams & readiness" },
  { id: "weeklyStudyPlan", icon: BookOpen, title: "Weekly study plan" },
  { id: "aiStudyPlans", icon: Sparkles, title: "AI study plans" },
  { id: "flashcards", icon: Layers, title: "Flashcards" },
  { id: "aiQuizzes", icon: Brain, title: "AI-generated quizzes" },
  { id: "weakTopics", icon: TriangleAlert, title: "Weak topics" },
  { id: "careerMatches", icon: Compass, title: "Career matches" },
  { id: "futureMap", icon: MapPin, title: "Future Map (roadmap)" },
  { id: "weeklyReview", icon: TrendingUp, title: "Weekly review" },
  { id: "xpStreaks", icon: Flame, title: "XP, streaks & achievements" },
];

const BUSINESS_FEATURES: FeatureCard[] = [
  { id: "milestoneTracking", icon: Target, title: "Milestone tracking" },
  { id: "aiBusinessSnapshot", icon: Sparkles, title: "AI business snapshot" },
  { id: "metricsLog", icon: TrendingUp, title: "Metrics log" },
  { id: "expenseTracking", icon: Receipt, title: "Expense tracking" },
  { id: "aiContentHelper", icon: Sparkles, title: "AI content helper" },
  { id: "competitorTracker", icon: Users, title: "Competitor tracker" },
];

// Per PRODUCT_SPECS_DEVIBE.md §5: eighteen identical icon-chip cards in one
// flat grid is the "statistically average AI aesthetic" the audit names
// verbatim — nothing draws the eye anywhere in particular. The three items
// per track that most differentiate Alxioum from a plain checklist app get
// promoted into a larger, chip-free card; the rest render as a denser list,
// not a second uniform card grid, so the section has two real tiers instead
// of one flat one.
const STUDENT_HEADLINE_IDS = new Set(["aiStudyPlans", "weakTopics", "careerMatches"]);
const BUSINESS_HEADLINE_IDS = new Set(["aiBusinessSnapshot", "metricsLog", "aiContentHelper"]);

function FeatureGrid({
  items,
  headline,
  t,
}: {
  items: FeatureCard[];
  headline: Set<string>;
  t: (key: string) => string;
}) {
  const headlineItems = items.filter((item) => headline.has(item.id));
  const listItems = items.filter((item) => !headline.has(item.id));

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-3">
        {headlineItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.id} variant="flat" className={HOVER_LIFT}>
              <CardContent className="p-5">
                <Icon className="h-5 w-5 text-accent" strokeWidth={2.25} />
                <p className="mt-4 text-body font-bold text-foreground">{t(`${item.id}.title`)}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t(`${item.id}.description`)}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {listItems.length > 0 && (
        <div className="mt-2 grid gap-x-8 md:grid-cols-2">
          {listItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id} className="flex items-start gap-3 border-b border-border/50 py-3">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2.25} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{t(`${item.id}.title`)}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{t(`${item.id}.description`)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * `withSectionBreak` (default `false`) opts this section into the top
 * divider used when it's rendered inline on the scrolling `/` page — a plain
 * `border-t border-border`. Standalone `/features` renders with the prop
 * omitted so it stays pixel-identical to the QA-signed-off `ba9001d` version
 * (PRODUCT_SPECS_SCROLL_LANDING.md §2). This is an opt-in prop, not a
 * pathname check, so the component can't silently diverge if rendered
 * somewhere new later.
 *
 * The section keeps its own local `relative overflow-hidden` wrapping
 * (rather than relying on a shared ancestor `<main>`) — previously this
 * scoped a `bg-ambient-glow` band to the section; per the de-vibe audit
 * (PRODUCT_SPECS_DEVIBE.md §2.4) that glow was removed here (kept only
 * behind the page's own Hero) since four radial blooms stacked down one
 * scroll reads as wallpaper, not a real "welcome" moment.
 *
 * `headingLevel` (default `"h1"`) — same opt-in-prop pattern as
 * `withSectionBreak`. Standalone `/features` renders with it omitted, so its
 * main heading stays an `<h1>` (the page's sole one, unchanged). Inline on
 * `/`, the Hero already owns the page's one `<h1>`, so `/` passes
 * `headingLevel="h2"` here to avoid a second `<h1>` on the same document —
 * matching `FaqSection`'s existing `<h2>` convention (QA-flagged, see
 * PROJECT_STATE.md "DEV FIX (scroll landing heading hierarchy)").
 */
export function FeaturesSection({
  withSectionBreak = false,
  headingLevel = "h1",
}: {
  withSectionBreak?: boolean;
  headingLevel?: "h1" | "h2";
}) {
  const t = useTranslations("FeaturesSection");
  const tStudent = useTranslations("FeaturesSection.student");
  const tBusiness = useTranslations("FeaturesSection.business");
  const Heading = headingLevel;
  return (
    <section
      id="features"
      className={cn("relative scroll-mt-20 overflow-hidden", withSectionBreak && "border-t border-border")}
    >
      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-24 pt-20 md:px-10 lg:px-16">
        <SectionKicker>{t("kicker")}</SectionKicker>
        <Heading className="mt-3 max-w-2xl text-title-lg font-bold leading-tight tracking-tight text-foreground">
          {t("title")}
        </Heading>
        <p className="mt-4 max-w-2xl text-body leading-relaxed text-muted-foreground">{t("subtitle")}</p>

        <section className="mt-14">
          <h2 className="text-subsection font-bold tracking-tight text-foreground">{t("studentTrack")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("liveToday")}</p>
          <div className="mt-6">
            <FeatureGrid items={STUDENT_FEATURES} headline={STUDENT_HEADLINE_IDS} t={tStudent} />
          </div>
        </section>

        <section className="mt-16">
          <Card variant="flat" className="relative overflow-hidden border-accent/30">
            <CardContent className="relative p-6 md:p-8">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-white">
                <Sparkles className="h-4 w-4" />
              </span>
              <p className="mt-4 text-xs font-bold uppercase tracking-widest text-accent">{t("aiCoachEyebrow")}</p>
              <h3 className="mt-2 text-heading font-bold tracking-tight text-foreground">{t("aiCoachTitle")}</h3>
              <p className="mt-3 max-w-2xl text-body leading-relaxed text-muted-foreground">{t("aiCoachDescription")}</p>
            </CardContent>
          </Card>
        </section>

        <section className="mt-16">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-subsection font-bold tracking-tight text-foreground">{t("forFounders")}</h2>
            <Badge tone="neutral">{t("comingSoon")}</Badge>
          </div>
          <h3 className="mt-3 max-w-2xl text-body font-semibold text-foreground">{t("founderSubtitle")}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{t("founderPaused")}</p>
          <div className="mt-6">
            <FeatureGrid items={BUSINESS_FEATURES} headline={BUSINESS_HEADLINE_IDS} t={tBusiness} />
          </div>
        </section>

        <section className="relative mt-20 overflow-hidden rounded-3xl border border-border bg-surface px-6 py-10 text-center shadow-subtle md:px-12 md:py-14">
          <h2 className="relative z-10 text-heading font-bold tracking-tight text-foreground">{t("ctaTitle")}</h2>
          <p className="relative z-10 mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">{t("ctaSubtitle")}</p>
          <div className="relative z-10 mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup">
              <Button size="lg">
                {t("getStarted")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/#pricing">
              <Button size="lg" variant="outline">
                {t("seePricing")}
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </section>
  );
}
