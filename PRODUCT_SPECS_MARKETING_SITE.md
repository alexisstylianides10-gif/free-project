# Marketing Site Expansion — Product Spec

**Author:** Product · **Date:** 2026-09-02 · **Base branch:** `claude/futureos-student-app-3ewdz6`

## 0. The ask, and the call I'm making

CEO asked for "a good landing page with 4-5 pages and all the info." Today the public surface is one hero
page (`/`) plus three real content pages already shipped (`/privacy`, `/terms`, `/faq`) that people can only
reach from a three-link footer. There's no Features page, no Pricing page, no About page, and — because
nothing links anywhere except the footer — no actual site structure. That's the gap to close, not a redesign
of what already works.

**Final page set (5 pages, all real routes):**

| # | Route | Status | What it's for |
|---|-------|--------|----------------|
| 1 | `/` | Exists — small, targeted changes only | Hero + conversion. Unchanged in substance. |
| 2 | `/features` | **New** | Real walkthrough of what's shipped, grounded in the actual app code, not aspirational copy. |
| 3 | `/pricing` | **New** | Real numbers from `src/lib/billing/plans.ts`, same framing as `/choose-plan` and `/app/upgrade`. |
| 4 | `/about` | **New** | Mission/positioning. Uses `[COMPANY NAME]`-style placeholders for anything I don't have real legal identity for, matching the exact convention already established in `/privacy` and `/terms`. |
| 5 | `/faq` | Exists — unchanged | Counts as the 5th page. See §1 for why I'm not building a separate Contact page instead. |

`/privacy` and `/terms` continue to exist and are linked from the footer everywhere, same as today — they're
not part of the "4-5 pages" count because they were never in scope as new marketing content; they're legal
pages that already exist and are already reviewed-as-draft.

No new database tables, no new API routes, no new design tokens. This is markup + copy on top of the
existing design system and existing data (`branding.ts`, `plans.ts`, the app's own nav/copy conventions).

---

## 1. Why FAQ is the 5th page, not a new Contact page

I considered a dedicated `/contact` page as the 5th page instead of counting the existing FAQ. Rejected it,
and I want to be explicit about why rather than quietly picking one.

`/privacy` and `/terms` both currently use `[CONTACT EMAIL]` and `[ADDRESS]` placeholders — there is no real
support email, ticketing system, or company address anywhere in this codebase yet. A "Contact" page needs one
of: a real mailto address, a working form (which needs a backend — new scope, not "just a page"), or a link
to a real support channel. Building a Contact page today would mean either (a) shipping a page whose only
content is `[CONTACT EMAIL]`, which is a worse experience than not having the page at all, or (b) inventing a
support mechanism that doesn't exist, which is exactly the kind of thing the No-BS rule tells me not to do.

FAQ, by contrast, is already real, substantive, and reviewed — it directly answers the two questions a
prospective user actually has (what is this, is there a free plan, can I switch tracks) and every answer in
it is checkable against the actual product. It's a legitimate destination page, not a stub. Counting it as
page 5 means all 5 pages in this set are real; a Contact page today would not have been.

**Recommendation, not built now:** once there's a real support email/company identity (i.e. once the
`[CONTACT EMAIL]`/`[COMPANY NAME]` placeholders in Privacy/Terms get resolved with real values), add
`/contact` as a genuine 6th page — simple `mailto:` link plus the same "safety/expectations" framing used
elsewhere, no form needed unless there's a real intake system behind it. Flagging this gap explicitly rather
than silently dropping it.

---

## 2. Site navigation — the actual gap this spec fixes

Right now nothing on `/` links to anything except Privacy/Terms/FAQ in the footer, and none of those three
pages link to each other or back to a nav — each is a dead-end with only a "Back to home" link
(`StaticContentPage.tsx`). Adding 3 new pages without also adding real cross-page navigation would just be 3
more dead ends. Two small, justified additions:

### 2a. New component: `MarketingNav` (`src/components/shared/MarketingNav.tsx`)

A slim, sticky top nav for `/`, `/features`, `/pricing`, `/about` only — **not** rendered on `/faq`,
`/privacy`, `/terms`, `/login`, `/signup`, `/choose-plan`. Those stay on the existing minimal
`StaticContentPage`/bespoke-auth-screen treatment deliberately: legal pages and auth flows benefit from
*less* chrome, not more, so nothing distracts from reading the terms or completing signup. This mirrors the
codebase's existing responsive-split convention almost exactly — `TopBar` is `md:`-only in-app, `BottomNav`
covers mobile; `MarketingNav` follows the same shape (full horizontal link row at `md:`+, compact
logo-plus-menu-button below `md:`), and its sticky-bar classes are lifted directly from `TopBar`'s own
(`sticky top-0 z-30 ... bg-background/75 backdrop-blur-xl`), not invented.

Below `md:`, the mobile menu reuses a pattern that's already shipped and proven, not a new primitive: the
`glass` rounded-2xl dropdown-panel-on-toggle interaction from `coach/page.tsx`'s `threadPanelOpen` (see
`src/app/app/coach/page.tsx` lines 184-245 for the reference implementation this borrows the shape from).

```tsx
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
```

### 2b. New component: `SiteFooter` (`src/components/shared/SiteFooter.tsx`)

The footer in `page.tsx` (lines 129-152) is currently inlined and only exists on `/`. It's about to be needed
identically on 4 pages, so extract it verbatim into a shared component and add the 3 new links — DRY-ing up
markup, not changing its visual design. Order matters: product links first (what the site is *about*), legal
last (existing convention already puts Privacy/Terms/FAQ last) — I'm inserting the new links *before* the
existing three, not scrambling the existing three's relative order:

```tsx
import Link from "next/link";
import { LogoMark } from "@/components/shared/LogoMark";
import { branding } from "@/lib/branding";

const FOOTER_LINKS = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
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
```

`StaticContentPage.tsx` (Privacy/Terms/FAQ) is **not** changed — it keeps its own "Back to home" link only.
Adding the full `SiteFooter` there would be a scope change to pages that are already reviewed/real and out of
scope for this ask; the minimal legal-page footer is a deliberate, existing pattern worth preserving, not an
oversight.

---

## 3. Page-by-page spec

### 3a. `/` (Home) — small, surgical changes only

**No hero, copy, proof-strip, or redirect-logic changes.** The hero already earns its keep: it's tight,
on-brand, and converts. The only thing wrong with it now is that it's an island with nowhere for a browsing
(not-yet-convinced) visitor to go except scroll to a 3-link footer. Two changes, both additive:

1. Mount `<MarketingNav />` as the very first element inside `<main>`, above the existing
   `<div className="relative flex flex-1 lg:items-stretch">` — it's `md:`-agnostic on its own (it renders its
   own responsive states), so no wrapper changes needed around it.
2. The existing inline hero branding row (`page.tsx` lines 78-81: `<LogoMark size={36}/><span>{branding.name}</span>`)
   gets `md:hidden` added to its wrapping `<div>`. Reason: once `MarketingNav` renders its own logo+name at
   `md:`+, keeping the hero's *second* logo+name directly below it would be a visible duplicate on every
   tablet/desktop view. Mobile is completely unaffected — `MarketingNav`'s only mobile-visible content is the
   compact bar, and the hero's own logo row is still the sole branding mobile users see, exactly as today.
3. Replace the inlined `<footer>...</footer>` block (lines 129-152) with `<SiteFooter />`.

That's the entire diff to `page.tsx`. `DeletedAccountBanner`, the redirect `useEffect`, the hero copy, the
proof strip, and `BrandPanel` are all untouched.

### 3b. `/features` (new)

**File:** `src/app/(public)/features/page.tsx`
**Metadata:** `{ title: "Features", alternates: { canonical: \`${siteUrl}/features\` } }`

**Layout pattern — deliberately NOT `StaticContentPage`.** `StaticContentPage` is a narrow (`max-w-2xl`),
single-column prose shell built for reading dense legal text linearly — it has no grid, no card slots, and
centers everything in one text column. Features needs card grids, section groupings, and a "Coming soon"
callout, none of which that shell supports without stretching it into something it isn't. Instead: a wide
(`max-w-6xl`) shell using `<MarketingNav />` + `<SiteFooter />` with the same `bg-ambient-glow` treatment
already used on `/` and `/choose-plan`, and content built entirely from already-shipped primitives —
`Card`/`CardContent`, `Badge`, lucide icons that are the *same* icons the real in-app screens already use for
these concepts (not new icon choices), so a returning signed-up user recognizes the iconography from the app
itself.

**Content — every claim below is traced to a real file, not invented:**

```
Eyebrow: FEATURES
H1: One plan. Built around what you're actually doing.
Sub: Alxioum tracks the real details of school or your business, then turns
     them into a daily plan, an AI Coach that knows your context, and a
     long-term roadmap you can watch move. Two tracks, one app — you pick
     yours once, at signup, and everything below is built around it.
```

**Section 1 — Student track (live today).** Card grid, `md:grid-cols-2 lg:grid-cols-3`, one card per
capability, icon + 1-line title + 1-2 sentence real description:

| Icon (lucide, matches in-app usage) | Title | Description | Source |
|---|---|---|---|
| `CalendarClock` | Timetable | Add your classes once and see today's schedule every morning, room numbers included. | `StudentSchoolHome.tsx` |
| `ClipboardCheck` | Homework tracking | Every assignment with a real due-date countdown, so nothing quietly goes overdue. | `StudentSchoolHome.tsx` |
| `CalendarClock` (or `Target`) | Exams & readiness | A live countdown per exam, plus an honest readiness % built from how you're actually doing on that subject's topics. | `StudentSchoolHome.tsx` (`subjectReadiness`) |
| `BookOpen` | Weekly study plan | A real Monday-Friday plan, session by session, that you check off as you go. | `StudentSchoolHome.tsx` |
| `Sparkles` | AI study plans | Generate a study plan for a specific subject or topic instead of guessing where to start. | `subjects/[subjectId]/plan/new/page.tsx` |
| `Layers` | Flashcards | Spaced-repetition flashcards that resurface exactly when you're about to forget them, not on a random schedule. | `school/flashcards/**` |
| `Brain` | AI-generated quizzes | Pick a subject, a difficulty (Easy through Exam Level), and a question count — get a real quiz, not a static bank. | `school/quizzes/page.tsx` |
| `TriangleAlert`/`CircleCheck` | Weak topics | The topics you're actually struggling with, surfaced plainly with your real attempt history — no vague advice. | `school/weak-topics/page.tsx` |
| `Compass` | Career matches | Career suggestions matched to the subjects, interests, and strengths you gave at onboarding, each with a real % match. | `future/StudentFutureHome.tsx` |
| `MapPin`/`Compass` | Future Map (roadmap) | A 6-level Discover → Learn → Build → Launch → Grow roadmap. The first steps advance automatically from what you actually do in the app; later ones you mark done yourself, honestly. | `catalog/roadmap.ts` |
| `TrendingUp` | Weekly review | A real weekly recap: study time, quiz accuracy, topics mastered, and how your week actually went. | `app/weekly-review/page.tsx` |
| `Flame` | XP, streaks & achievements | Real actions earn real XP and unlock achievements — no filler gamification. | `StudentSchoolHome.tsx`, `catalog/achievements.ts` |

**Section 2 — AI Coach (both tracks).** One wider callout card, not a grid item:

```
Eyebrow: AI COACH
Title: A coach that actually knows what's on your plate
Body: Ask about a subject, your career options, or what to do today, and
      the Coach answers using your real homework, exams, and career match —
      not generic advice. Keeps full conversation history across as many
      threads as you want, and (for students) always keeps school first.
```
Sourced from `coach/page.tsx` (`buildRecommendationChips`, persistent `chat_threads`, the literal in-app copy
"I'll always make sure school comes first" / "I'll keep it real, not hype.").

**Section 3 — Business track**, headed with a visible "Coming soon" badge (`Badge tone="neutral"`, same
"Coming soon" wording and treatment already used on `/choose-plan`'s `ChoosePlanClient.tsx` for the business
card — do not invent new "coming soon" copy):

```
Eyebrow: FOR FOUNDERS · COMING SOON
Title: Everything above, rebuilt for a business instead of a transcript
Sub: The founder track is paused for new signups while we polish it — here's
     what it already does for the students... [see below, corrected]
```
Corrected sub-copy (business track isn't "for students" — write it standalone):
```
Sub: The founder track is currently paused for new signups while we polish
     it. Here's what it already builds:
```

Card grid, same shell as Section 1:

| Icon | Title | Description | Source |
|---|---|---|---|
| `Target` | Milestone tracking | Your idea, its stage (Idea → Validating → Building → Launched), and a milestone checklist you actually complete. | `BusinessPlanHome.tsx` |
| `Sparkles` | AI business snapshot | A short AI-written snapshot of your idea, generated from what you tell it at onboarding. | `BusinessPlanHome.tsx` (`ai_snapshot`) |
| `TrendingUp` | Metrics log | Log revenue, customers, or signups over time and see the trend versus your last entry. | `BusinessGrowHome.tsx` |
| `Receipt` | Expense tracking | Log spend by category (software, marketing, contractors, and more) and see your running total. | `BusinessGrowHome.tsx` |
| `Sparkles` | AI content helper | Generate a first draft of Instagram, blog, or email content for a topic you give it. | `BusinessGrowHome.tsx` (`generate-content`) |
| `Users` | Competitor tracker | Keep a running list of who else is in your market, with notes. | `BusinessGrowHome.tsx` |

**Closing CTA section:**
```
Title: Pick your track. We'll build around it.
Body: Alxioum is a planning and study tool that helps you stay organized and
      explore your options — it's not a guarantee of grades, a job, or a
      business outcome. [safety framing, consistent with Terms' AI-features
      disclaimer and branding tone]
[Get Started -> /signup]  [See pricing -> /pricing]
```

### 3c. `/pricing` (new)

**File:** `src/app/(public)/pricing/page.tsx`
**Metadata:** `{ title: "Pricing", alternates: { canonical: \`${siteUrl}/pricing\` } }`

**Layout pattern:** same wide shell as Features (`MarketingNav` + `SiteFooter` + `bg-ambient-glow`), but
content is a 2-card pricing comparison (Free / Plus) plus a disabled 3rd "Business — coming soon" card, not a
feature grid. Reuses the exact monthly/yearly toggle interaction already built and shipped twice
(`ChoosePlanClient.tsx` lines 72-95, `upgrade/page.tsx` lines 140-165) — same markup shape, same
`bg-muted p-1` pill toggle, same `-{yearlySavingsPercent}%` badge computed live from `PLAN_OPTIONS`, not
hardcoded. **This is the one place in this spec I'm flagging explicitly: the savings % must be computed with
the same formula already used in both existing screens (`Math.round((1 - yearlyTotal / (monthlyTotal * 12)) * 100)`
applied to `PLAN_OPTIONS`), not typed in as a literal "17%" — if pricing ever changes in `plans.ts`, this page
must not silently go stale.** At today's numbers (`priceUsd`: student $9.99/mo, $99/yr; business $19.99/mo,
$199/yr) that formula currently evaluates to 17% for both tracks.

**Content:**

```
Eyebrow: PRICING
H1: Simple pricing. The organizing tools are always free.
Sub: Pay only if you want the AI on top.
```

**Free card** (no toggle needed — free is free regardless of interval):
```
Title: Free
Price: $0
Tagline (student): School tracking (timetable, homework, exams, career
       matches, and your roadmap) is always free.
Tagline (business, shown in the same card but visually paired with the
       "coming soon" business column — see below): Your business plan
       basics, milestone checklist, and metrics log are always free.
Includes:
  - Timetable, homework & exam tracking
  - Career matches & Future Map roadmap
  - Weekly review, deadlines, XP & achievements
  - (business, coming soon) Business plan, milestones, metrics & expenses
```
Tagline copy pulled verbatim from `upgrade/page.tsx`'s `FREE_TAGLINE_BY_TRACK` — the exact, real in-app
promise, not new marketing language that could drift from what the product actually does.

**Plus card (Student — live):**
```
Title: Alxioum Plus · Student
Price: $9.99/mo  or  $99/yr  [-17% badge, toggle-driven]
Perks:
  - AI Coach: your always-on mentor for school, skills, and career
  - AI study plans built around your real exams and deadlines
  - Upload notes, photos, or PDFs and get an instant AI breakdown
  - AI tutor sessions, quizzes, and spaced-repetition flashcards
Fine print: 3-day free trial, no card required. Cancel anytime.
[Get Started -> /signup]
```
Perks list copied verbatim from `upgrade/page.tsx`'s `PERKS_BY_TRACK.student` — this guarantees the marketing
promise and the actual in-app upsell never say two different things. Trial copy copied verbatim from
`ChoosePlanClient.tsx` line 156.

**Plus card (Business — coming soon), visually `opacity-60` matching `ChoosePlanClient.tsx`'s exact treatment
for the same state, with a "Coming soon" `Badge` and a disabled button, not a clickable CTA:**
```
Title: Alxioum Plus · Business
Price: $19.99/mo  or  $199/yr  [-17% badge]
Perks:
  - AI Coach: your always-on mentor for building your business
  - An AI-generated snapshot and starter milestones for your idea
  - AI-drafted marketing and content ideas for any platform
  - Milestone, metrics, and competitor tracking in one place
[Coming soon] (disabled button, no link — matches ChoosePlanClient's disabled <Button disabled> exactly,
              not a fake "join waitlist" form that doesn't exist anywhere in this codebase)
```
Perks again copied verbatim from `upgrade/page.tsx`'s `PERKS_BY_TRACK.business`.

**FAQ strip at the bottom** (3-4 short Q&As, not a full new FAQ — just the pricing-adjacent ones, linking to
the full `/faq` for more): "Is there really a free plan?" (yes, verbatim FAQ answer), "What happens after my
trial?", "Can I switch between monthly and yearly?", "Can I switch tracks?" (verbatim FAQ answer re: track
lock + business-paused note). Reuses `FAQ_LINK -> /faq` rather than duplicating the full FAQ page's content
wholesale.

### 3d. `/about` (new)

**File:** `src/app/(public)/about/page.tsx`
**Metadata:** `{ title: "About", alternates: { canonical: \`${siteUrl}/about\` } }`

**Layout pattern:** here I'm using `StaticContentPage`, not the wide grid shell — About is genuinely prose
(mission statement + a few paragraphs + a values list), the same shape as Privacy/Terms/FAQ's content, not a
feature grid. The one addition: mount `<MarketingNav />` above `StaticContentPage`'s own header row (About is
a marketing page, not a legal page, so it keeps the fuller nav unlike Privacy/Terms/FAQ) and swap
`StaticContentPage`'s own "Back to home" link/footer for `<SiteFooter />` at the bottom instead, since About
is meant to lead somewhere (Features, Pricing, signup), not dead-end. Concretely: reuse `StaticContentPage`'s
internal `<h1>`/prose-container markup pattern directly in a bespoke `about/page.tsx` rather than trying to
retrofit optional nav/footer props onto the shared component — `StaticContentPage` stays exactly as-is,
serving Privacy/Terms/FAQ only, so nothing about this change touches those three already-reviewed pages.

**Content — grounded, with explicit placeholders for anything requiring real corporate identity I don't
have, same `[COMPANY NAME]`-style convention as `/privacy` and `/terms`:**

```
H1: Built for the two groups everyone else designs around.

Most productivity apps are built for people who already have their life
figured out: a stable job, a clear five-year plan, deadlines set by someone
else. Alxioum is built for two groups who don't have that yet — students
still building their transcript and their sense of what's next, and early
founders still building a business with no one telling them what to do next
either.

## Why one app, two tracks

We didn't want a generic to-do list with a school skin and a business skin
bolted on. So Alxioum asks you, once, at signup: are you building a
transcript or a business? Whichever you pick locks in and the entire app —
your Home, your daily plan, your AI Coach's context, your long-term roadmap
— is built around that answer from day one. No mode-switching, no
half-built middle ground. (The founder track is currently paused for new
signups while we finish polishing it — see our FAQ for details.)

## What we actually believe

- **No tracking, no ads.** Alxioum doesn't run behavioral-advertising
  tracking or third-party ad pixels. The only cookie in play is the one
  that keeps you signed in. See our Privacy Policy for the specifics.
- **Honesty over gamification.** Some parts of your roadmap you can only
  advance by telling us you actually did the real-world thing — we can't
  verify you launched a project or shipped a business milestone, so we
  don't pretend to. You mark it done because you did it, not because the
  app tricked you into a streak.
- **This is a planning tool, not a promise.** Alxioum helps you organize
  your school work or your business and explore your options with AI
  support — it doesn't guarantee your grades, a job, or a business outcome.
  Any AI-generated content (study plans, quizzes, business drafts) is a
  starting point, not a substitute for your teacher, your own judgment, or
  a qualified professional.

## Who's behind it

Alxioum is built by [COMPANY NAME]. [FOUNDING STORY / TEAM PLACEHOLDER —
add real detail here once there's a public-facing story to tell; nothing
in this codebase currently establishes a founding date, team size, or
company history, so nothing is invented here].

Questions? Reach us at [CONTACT EMAIL] — same address as our Privacy Policy
and Terms of Service.

[Get Started -> /signup]  [See what it does -> /features]
```

The "Who's behind it" section is deliberately short and placeholder-heavy rather than padded with invented
specifics — a fabricated founding story would be exactly the kind of thing the No-BS rule prohibits. Everyone
on the team should treat `[COMPANY NAME]`, `[FOUNDING STORY / TEAM PLACEHOLDER]`, and `[CONTACT EMAIL]` here
as needing the same real-world fill-in that the identical placeholders in `/privacy` and `/terms` already
need — this page doesn't introduce new unresolved placeholders, it reuses the exact same ones.

### 3e. `/faq` — no changes

Confirmed as-is: real, reviewed, accurate. The only touch this spec makes near it is that it now also gets
linked from `MarketingNav` and `SiteFooter` (§2), and gets a small inbound link from `/pricing`'s FAQ strip
(§3c) and `/about`'s FAQ mention. `StaticContentPage.tsx` itself is untouched.

---

## 4. Sitemap

`src/app/sitemap.ts` needs the 3 new routes added to its `routes` array (same shape as existing entries, not
a new pattern):

```ts
{ path: "/features", priority: 0.8, changeFrequency: "monthly" },
{ path: "/pricing", priority: 0.9, changeFrequency: "monthly" },
{ path: "/about", priority: 0.5, changeFrequency: "yearly" },
```
Priorities: Pricing slightly above Features (a pricing page is typically the higher-intent page for an
almost-converted visitor), both above the existing `/choose-plan` (0.6) since they're now real top-of-funnel
content instead of a mid-signup screen. `/robots.ts` needs **no change** — it already `allow: "/"` broadly
and only disallows `/app/` and `/api/`, which already covers these new routes correctly.

---

## 5. Exact file list for Dev

**New files:**
- `src/components/shared/MarketingNav.tsx` — spec + reference code in §2a
- `src/components/shared/SiteFooter.tsx` — spec + reference code in §2b
- `src/app/(public)/features/page.tsx` — spec in §3b
- `src/app/(public)/pricing/page.tsx` — spec in §3c
- `src/app/(public)/about/page.tsx` — spec in §3d

**Modified files:**
- `src/app/(public)/page.tsx` — mount `MarketingNav`, `md:hidden` on the existing inline logo row, swap
  inline footer for `SiteFooter` (§3a). No other changes.
- `src/app/sitemap.ts` — add 3 routes (§4).

**Untouched, confirmed in scope review:**
- `src/app/(public)/faq/page.tsx`, `src/app/(public)/privacy/page.tsx`, `src/app/(public)/terms/page.tsx`
- `src/components/shared/StaticContentPage.tsx`
- `src/app/(public)/layout.tsx` (still the only place `CookieBanner` mounts — new pages inherit it correctly
  since they're all still inside the `(public)` route group)
- `src/lib/branding.ts`, `src/lib/billing/plans.ts` — read from, not modified
- `src/app/robots.ts` — confirmed no change needed (§4)
- All `/app/**` product surface files — read for accuracy, not touched

No schema changes. No new API routes. No new design tokens, colors, or component variants — every visual
element used above (`Card`, `CardContent`, `Badge`, `Button` variants `primary`/`secondary`/`outline`,
`bg-gradient-brand`, `text-gradient-brand`, `.glass`, `bg-ambient-glow`) already exists in the codebase today.

---

## 6. Things I deliberately did not do

- **Did not build a Contact page** — see §1.
- **Did not add a business-track waitlist/signup capture** on `/pricing` or `/features` — there's no backend
  for it anywhere in this codebase, and a fake-looking "Notify me" button that doesn't actually do anything
  would be worse than the current honest "Coming soon, disabled" treatment `/choose-plan` already uses.
  If/when the founder track reopens, this is a real feature to consider, not something to fake now.
- **Did not touch onboarding, signup, or checkout flows.** Pricing links out to `/signup`; actual checkout
  only ever happens in-app at `/app/upgrade` (needs an authenticated user id for `create-subscription`) — the
  marketing site was never going to run Stripe checkout itself, and this spec doesn't change that boundary.
- **Did not invent competitor comparisons, testimonials, or usage stats.** No "trusted by X students" claims,
  no fabricated logos or quotes. The only stats used anywhere in this expanded site are the same three
  checkable claims already in the existing hero's `PROOF` strip (`page.tsx` lines 12-16) — this spec doesn't
  add new unverifiable numbers.
