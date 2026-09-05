# Scroll Landing Page — Restructure Spec

**Author:** Product · **Date:** 2026-09-02 · **Base branch:** `claude/futureos-student-app-3ewdz6`
(base commit `ba9001d` — "QA review: Marketing site expansion — sign-off given")

## 0. The ask

CEO's exact words: "no like you scroll down find from online" — i.e. the just-shipped 4-route marketing
site (`/`, `/features`, `/pricing`, `/about`, plus `/faq`) should stop making people click between pages and
instead work like the sites they actually mean (Notion, Linear, Stripe): land on `/`, scroll down, and
everything — features, pricing, about, FAQ — is right there, in order, on one page.

This spec restructures `/` into that single scrolling page and defines exactly how the already-shipped,
QA-approved content from `/features`, `/pricing`, `/about` gets reused (not rewritten) as sections on it.

---

## 1. Do the standalone routes survive? Yes — kept exactly as they are today, just unlinked from primary nav.

**Call: keep `/features`, `/pricing`, `/about` as real, live, unchanged-in-substance routes.** `/` becomes the
primary experience; the standalone routes become secondary direct-link/SEO/ads destinations, not part of the
site's primary navigation surface anymore.

Why, for real, not just defaulting to "safest":

- **Zero risk to QA-approved content.** `ba9001d` is a real sign-off with a real verification pass (pricing
  math, perk fidelity, build gate, rendering at 4 viewport/theme combos). Deleting or redirecting those routes
  throws that verification away for no product benefit. Folding them entirely into `/` and killing the routes
  would also silently break anything currently pointing at `/pricing` — sitemap.xml, this session's own QA
  report, and any external link that already exists.
- **A dedicated `/pricing` URL is genuinely useful**, independent of the one-page redesign: it's the URL you
  put in a Google/Meta ad, a comparison-shopping search result, or a Slack message to a colleague — "here's
  our pricing" — without making them land on a full hero + nav they have to scroll past. `/#pricing` works for
  that too (see §3), but a clean top-of-funnel `/pricing` costs nothing extra to leave live and is a strictly
  better SEO surface (a page whose `<title>` and content are laser-focused on "pricing" ranks better for
  pricing-intent search queries than a hash-fragment on the homepage, which most crawlers don't index as a
  separate result).
- **This is exactly what Notion, Linear, and Stripe actually do** — the CEO's own reference points. All three
  have a scrolling `/` *and* standalone `/pricing` (Stripe, Notion) reachable directly, not merged away. The
  "scroll and find everything" experience and "a dedicated URL still exists" are not in tension; that's the
  actual pattern being asked for.
- **The real cost is near-zero.** No new pages to build, no redirect logic to get right, no 404 risk if
  something still links to `/pricing` externally. The only price is "these routes and `/` will share visible
  content," which is a well-established, low-risk SEO pattern (see §6) — not a reason to delete a working page.

**What does change:** primary chrome (`MarketingNav`, `SiteFooter`, and every in-content cross-link that used
to point at `/features`/`/pricing`/`/about`/`/faq`) now points at the merged sections on `/` (`/#features` etc.)
instead of the standalone routes (§3). The standalone routes stop being *how people are steered around the
site* and become *pages that still exist and still work* if someone lands on them directly. `/privacy` and
`/terms` are unaffected either way — they were never candidates for merging (legal pages, not marketing
content) and keep their existing `StaticContentPage` treatment and footer-only linking, unchanged.

---

## 2. Content reuse — extract once, render twice, never duplicate copy

Ground rule from the CEO/Cato brief and repeated here because it's the backbone of this spec: the
Features/Pricing/About bodies are real, QA-approved content. This spec extracts each page's **inner content**
(everything between `<MarketingNav />` and `<SiteFooter />`) into its own presentational component, so the
exact same JSX/copy renders in two places — the standalone route and the new `/` section — from one source.

| Extracted component | New file | Copy source (unchanged) | Used by |
|---|---|---|---|
| `FeaturesSection` | `src/components/marketing/FeaturesSection.tsx` | `features/page.tsx`'s current body | standalone `/features`, `/` |
| `PricingSection` | `src/components/marketing/PricingSection.tsx` | `pricing/PricingClient.tsx`'s current body | standalone `/pricing`, `/` |
| `AboutSection` | `src/components/marketing/AboutSection.tsx` | `about/page.tsx`'s current body | standalone `/about`, `/` |
| `FaqSection` | `src/components/marketing/FaqSection.tsx` (new content, not new copy — see §4) | reuses `PricingSection`'s existing `PRICING_FAQ` array verbatim | `/` only |

Each standalone route becomes a thin wrapper: `<main><MarketingNav /><XSection /><SiteFooter /></main>` — same
as today, just with the body swapped for the extracted component. `/`'s body becomes
`<Hero /* unchanged */><FeaturesSection /><PricingSection showFaqStrip={false} /><AboutSection sectionBreak /><FaqSection /><SiteFooter />`.

**Critical constraint, stated explicitly because it's easy to get subtly wrong: the standalone routes must
render pixel-identical to what QA already signed off on `ba9001d`.** That means the section-boundary visual
treatment this spec adds for the `/`-scrolling context (§5 — top dividers, background bands) must NOT appear
on the standalone routes. Solved with an opt-in prop, not a pathname check (a pathname check would silently
break the moment someone renders these components anywhere else):

```tsx
// FeaturesSection.tsx / PricingSection.tsx
export function FeaturesSection({ withSectionBreak = false }: { withSectionBreak?: boolean }) { ... }

// AboutSection.tsx
export function AboutSection({ sectionBreak = false }: { sectionBreak?: boolean }) { ... }
```
Default `false` everywhere → standalone routes get zero visual diff from today. `/` explicitly opts every
section into `true`. `PricingSection` additionally takes `showFaqStrip` (see §4) — **this is the one place in
this spec where a section's sub-content is genuinely conditional on where it's rendered; flag it as such in
the component (comment + prop, not a silent pathname branch) so Dev builds it defensively, the way QA's
CSS-grid note asked for.**

---

## 3. Navigation mechanism — plain `<Link href="/#section">`, no new library, no scroll-spy

**Mechanism:** every nav/footer/in-content link that used to point at `/features`, `/pricing`, `/about`,
`/faq` now points at `/#features`, `/#pricing`, `/#about`, `/#faq` — a real, absolute, hash-suffixed URL,
using plain `next/link`. Nothing else changes about how the links are written.

Why this is the right call and not something fancier:

- **Next.js App Router's `<Link>` already handles both cases correctly, natively, no extra code.** Clicking
  `/#features` from `/about` does a normal route transition to `/`, then scrolls to the element with
  `id="features"`. Clicking it while already on `/` scrolls directly, without a full remount. This is
  documented App Router behavior ("linking to an `id`"), not a new pattern — it's exactly the
  `<Link href="/#features">` idiom named in the task brief, not a scroll-spy library or manual
  `scrollIntoView` click handler.
- **One href value works everywhere.** No `pathname === "/"` branching needed in `MarketingNav` to decide
  between a bare `#features` and `/#features` — always use the absolute `/#section` form, so a link works
  identically whether it's clicked from `/`, `/about`, or pasted cold into a browser address bar.
- **Anchor targets get `scroll-mt-20`** (Tailwind's built-in utility, 5rem/80px, not a new token) on every
  `id`-bearing section, so the scroll lands below the sticky `MarketingNav` header instead of tucking the
  section title under it. 80px comfortably clears the nav's own height (~28px logo + ~28px vertical padding +
  1px border ≈ 57–65px depending on breakpoint) with margin to spare.
- **`scroll-smooth` added to the root `<html>` element** (`src/app/layout.tsx`, one class added to the
  existing `className={inter.variable}`), so the browser animates the jump instead of an instant cut — the
  literal CSS property Next's own docs pair with this pattern, not a JS animation library. This is a global
  (not marketing-page-scoped) change since `scroll-behavior` only works on the actual scrolling box (`html`),
  and there's no wrapper the marketing pages alone can own that would let a scoped class do anything. Checked
  for conflicts: the only two other places in the codebase that call `scrollIntoView`/`scrollTo`
  (`src/app/app/coach/page.tsx`, `src/app/app/school/subjects/[subjectId]/session/page.tsx`) are both
  chat/session auto-scroll-to-latest behaviors that read as an *improvement* with smooth easing rather than an
  instant snap — but flagging this for Dev/QA to actually look at both call sites before merging, not asserting
  it's fine from a read alone.

**One real regression I'm calling out, not hiding:** `MarketingNav`'s current active-link underline
(`pathname === l.href ? "text-foreground" : "text-muted-foreground"`) cannot work correctly anymore. Now that
every link's `href` is `/#section` and `pathname` never includes a hash fragment, that comparison would always
evaluate false — every nav link would silently look "inactive" forever, on every page, which is a worse,
sneakier bug than having no active-state at all. **Call: drop the active-state comparison for these four links
entirely** rather than ship code that's structurally incapable of ever being true. A correct fix (highlighting
whichever section is currently in the viewport while scrolling) needs an `IntersectionObserver` scroll-spy,
which is new interaction complexity beyond "plain `<Link>`, no new library" — worth a future pass if the CEO
wants it, not bundled into this restructure. Flagging as a known, deliberate gap, not a silent regression.

**Files touched for this:**
- `src/components/shared/MarketingNav.tsx` — `LINKS` hrefs updated to `/#features` / `/#pricing` / `/#about` /
  `/#faq` (both the `md:` row and the mobile dropdown use the same array, no duplicate edit needed); remove the
  now-broken `pathname === l.href` active-state ternary, links render as `text-muted-foreground` always
  (matching their current "not the active page" look) with `hover:text-foreground` doing the only state work,
  same as it already does today for every page that isn't a nav-linked route.
- `src/components/shared/SiteFooter.tsx` — same href swap for `FOOTER_LINKS`' Features/Pricing/About/FAQ
  entries; `Privacy`/`Terms` entries are untouched real routes (`/privacy`, `/terms`).
- `src/app/layout.tsx` — add `scroll-smooth` to the root `<html>` `className`.
- In-content cross-links inside the extracted sections that used to point at a sibling standalone page now
  point at its `/#anchor` instead, for the same "one coherent scrolling destination from every entry point"
  reasoning, with one deliberate exception (§4's `/faq` link):
  - `FeaturesSection`'s closing CTA: `See pricing → /pricing` becomes `See pricing → /#pricing`.
  - `AboutSection`'s closing CTA: `See what it does → /features` becomes `See what it does → /#features`.
  - Both changes are href-only — zero copy/text changes to either button's label or any surrounding prose.

---

## 4. FAQ — its own section, reusing `PricingSection`'s existing Q&A verbatim, not `/faq`'s

**Call: yes, FAQ becomes a real, top-level section on `/`** — "scroll down and find everything" should include
the FAQ, not force a click-away for four short Q&As. But *which* Q&As matters, and this needed an actual
decision, not just "copy `/faq`'s three questions in":

`/faq/page.tsx`'s own list is 3 questions: *What is Alxioum?* / *Is there a free plan?* / *Can I switch
tracks?*. `PricingSection`'s existing `PRICING_FAQ` (today rendered as a "Pricing questions" strip at the
bottom of `/pricing`) is 4 questions: *Is there really a free plan?* / *What happens after my trial?* / *Can I
switch between monthly and yearly?* / *Can I switch tracks?*. Once both are stacked on the same scrolling
page, two of `/faq`'s three questions ("free plan," "switch tracks") are near-verbatim repeats of questions
`PricingSection` already answers a few hundred pixels above — reading "Can I switch tracks?" twice in one
scroll is exactly the kind of unpolished, undifferentiated wall the task asked me to avoid, not a minor nit.

**Resolution:** the new `FaqSection` on `/` reuses `PRICING_FAQ` (all 4 Q&As, unchanged, promoted from a
`PricingClient.tsx`-local `const` to a shared `src/lib/marketing/faq.ts` export so `PricingSection` and
`FaqSection` both import the same data, not two copies) under a general "Frequently asked questions" heading
instead of "Pricing questions." `PricingSection`'s own embedded FAQ strip is suppressed when rendered inline on
`/` via the `showFaqStrip` prop (default `true`, so standalone `/pricing` is unaffected; `/` passes `false`)
— otherwise the same 4 questions would render twice on the same page, once inside Pricing and once in the
dedicated FAQ section right after it.

`/faq`'s own 3-question `QUESTIONS` array and the standalone `/faq/page.tsx` route are **left completely
untouched** — not merged in, not deleted, not shortened. It remains the plain, zero-chrome-distraction,
directly-shareable FAQ URL for anyone who wants exactly that (its "What is Alxioum?" opener genuinely only
makes sense with no other context, e.g., an ad landing straight on `/faq` — on `/` that question is already
answered by the Hero two seconds of scroll above, so it's correctly *not* repeated there either). I
deliberately did **not** add a "See the full FAQ → /faq" link from the new `/`-page `FaqSection`, unlike
`PricingSection`'s existing strip which does link to `/faq` — because `/faq`'s 3 questions are now a strict
subset of what `FaqSection` already shows (4 questions, including both of `/faq`'s non-identity questions);
calling it "the full FAQ" from a section that already shows more would be actively misleading. `FaqSection`
instead closes with `/faq/page.tsx`'s own existing sign-off line, reused verbatim: *"More questions? We're
adding to this list. Reach out and we'll answer directly."*

`PricingSection`'s own `See the full FAQ → /faq` link (inside its embedded strip, standalone-route-only via
`showFaqStrip`) is left pointing at the real `/faq` route, not `/#faq` — the one deliberate exception to §3's
"every in-content link becomes an anchor" rule, because on the standalone `/pricing` page there is no `/#faq`
section to scroll to (it only exists on `/`), so the real route is the only correct target there.

---

## 5. `/` page structure, top to bottom

```
<main> (unchanged wrapper, bg-background)
  <MarketingNav hideLogoOnMobile />                         — unchanged component, updated hrefs (§3)

  Hero                                                       — 100% unchanged (copy, proof strip, BrandPanel,
                                                                 redirect logic, DeletedAccountBanner — nothing
                                                                 in this spec touches the hero)

  <FeaturesSection withSectionBreak />         id="features"  scroll-mt-20 · border-t border-border · keeps its
                                                                 own bg-ambient-glow (already in the extracted
                                                                 content) as the section's visual identity —
                                                                 re-triggering the same soft radial bloom used
                                                                 on Hero/`/choose-plan` gives Features its own
                                                                 "new zone" feel without inventing a new effect

  <PricingSection withSectionBreak             id="pricing"   scroll-mt-20 · border-t border-border · own
      showFaqStrip={false} />                                  bg-ambient-glow (same reasoning as Features)

  <AboutSection sectionBreak />                id="about"     scroll-mt-20 · border-t border-border ·
                                                                 bg-surface full-bleed band (About is plain
                                                                 prose with no card grid/glow of its own, so a
                                                                 flat background-color shift — the same
                                                                 `bg-surface` token already used for Features'
                                                                 own closing CTA panel and every `Card` — is
                                                                 the cleanest way to make it read as a distinct
                                                                 zone rather than "Features' cards just stopped
                                                                 and paragraphs started"). Inner content stays
                                                                 the existing narrow `max-w-2xl` centered
                                                                 column — full-width background, narrow text
                                                                 column, a deliberate width contrast against the
                                                                 max-w-6xl grid sections around it)

  <FaqSection />                               id="faq"       scroll-mt-20 · border-t border-border · plain
                                                                 bg-background (no glow, no surface band — by
                                                                 this point in the scroll the page has already
                                                                 used both available separator treatments twice
                                                                 each; a third, quieter treatment for the last
                                                                 content section before the footer avoids
                                                                 over-decorating the page, and the footer's own
                                                                 border-t immediately below still closes it off
                                                                 cleanly)

  <SiteFooter />                                              — unchanged component, updated hrefs (§3)
```

Every divider/background technique above (`border-t border-border`, `bg-surface`, `bg-ambient-glow`,
`scroll-mt-*`) already exists in the codebase today (proof strip divider, footer divider, Features' own CTA
panel, Features'/Pricing's/`/choose-plan`'s ambient glow, Tailwind's stock `scroll-mt-*` scale) — nothing new
was invented for this spec, consistent with the standing ground rule.

**No conditional-rendering landmine like the CSS-grid dashboard issue exists here**, and it's worth saying so
explicitly rather than leaving Dev to wonder: every card grid in `FeaturesSection`/`PricingSection` renders
from a static, always-fully-populated array (`STUDENT_FEATURES`, `BUSINESS_FEATURES`, `PRICING_FAQ`) — nothing
is conditionally shown/hidden per logged-out visitor state the way in-app dashboard cards are per-user-state.
The only genuinely conditional pieces in this whole spec are the two props already called out in §2
(`withSectionBreak`/`sectionBreak`) and `showFaqStrip` in §4 — both booleans, both driven by which page is
rendering the component, not by any runtime/user data, and both explicitly documented in the component itself.

---

## 6. SEO note (not a new decision, just stating the tradeoff plainly)

Once `FeaturesSection`/`PricingSection`/`AboutSection` render literally the same JSX on both `/` and their
standalone route, `/` and e.g. `/features` will share a large block of identical text. This is the same
pattern Stripe/Notion/Linear (the CEO's own reference points) already run in production — a homepage with
inline pricing/feature copy *and* a standalone pricing/features page with the same claims — and isn't treated
as a duplicate-content penalty risk at that scale; each page still has its own `<title>`/canonical
(`alternates.canonical` already set per-page in `features/page.tsx`, `pricing/page.tsx`, `about/page.tsx`,
untouched by this spec) so search engines can index each on its own terms. `sitemap.ts` needs **no changes** —
all of `/`, `/features`, `/pricing`, `/about`, `/faq` remain real, already-listed URLs at their existing
priorities; fragment URLs like `/#pricing` are not something you add to a sitemap.

---

## 7. Exact file list for Dev

**New files:**
- `src/components/marketing/FeaturesSection.tsx` — extracted from `features/page.tsx`'s current body (eyebrow
  through closing CTA), `withSectionBreak` prop (§2), `See pricing` CTA target updated to `/#pricing` (§3).
- `src/components/marketing/PricingSection.tsx` — extracted from `pricing/PricingClient.tsx`'s current body
  (`"use client"`, owns the monthly/yearly toggle state, unchanged), `withSectionBreak` + `showFaqStrip` props
  (§2, §4).
- `src/components/marketing/AboutSection.tsx` — extracted from `about/page.tsx`'s current body, `sectionBreak`
  prop (§2), `See what it does` CTA target updated to `/#features` (§3).
- `src/components/marketing/FaqSection.tsx` — new component, content = `PRICING_FAQ` (imported from
  `src/lib/marketing/faq.ts`, not re-typed) under a "Frequently asked questions" heading, closing line reused
  verbatim from `/faq/page.tsx` (§4).
- `src/lib/marketing/faq.ts` — `PRICING_FAQ` array, moved verbatim out of `pricing/PricingClient.tsx` (same 4
  Q&A objects, same copy, just relocated so two components can import one source instead of two copies
  existing).

**Modified files:**
- `src/app/(public)/page.tsx` — after the existing Hero block (unchanged) and before `<SiteFooter />`, mount
  `<FeaturesSection withSectionBreak />`, `<PricingSection withSectionBreak showFaqStrip={false} />`,
  `<AboutSection sectionBreak />`, `<FaqSection />`, in that order (§5). No other changes — hero copy, proof
  strip, redirect `useEffect`, `DeletedAccountBanner`, `BrandPanel` all untouched.
- `src/app/(public)/features/page.tsx` — body replaced with `<FeaturesSection />` (no props → defaults render
  it identically to today). `metadata`/canonical untouched.
- `src/app/(public)/pricing/PricingClient.tsx` — body replaced with `<PricingSection />` (no props → defaults
  render it identically to today, including its embedded FAQ strip). `pricing/page.tsx` itself (the thin
  server-component metadata wrapper) is untouched.
- `src/app/(public)/about/page.tsx` — body replaced with `<AboutSection />` (no props → identical to today).
  `metadata`/canonical untouched.
- `src/components/shared/MarketingNav.tsx` — `LINKS` href updates + active-state ternary removal (§3).
- `src/components/shared/SiteFooter.tsx` — `FOOTER_LINKS` href updates for the 4 non-legal entries only (§3).
- `src/app/layout.tsx` — add `scroll-smooth` to the root `<html>` `className` (§3).

**Untouched, confirmed in scope review:**
- `src/app/(public)/faq/page.tsx`, `src/app/(public)/privacy/page.tsx`, `src/app/(public)/terms/page.tsx`,
  `src/components/shared/StaticContentPage.tsx` — no changes; `/faq`'s own `QUESTIONS` stays where it is (§4).
- `src/app/sitemap.ts`, `src/app/robots.ts` — no changes needed (§6).
- `src/lib/branding.ts`, `src/lib/billing/plans.ts` — read from, not modified.
- `pricing/page.tsx` (the server-component metadata wrapper around `PricingClient`) — untouched.

No schema changes. No new database tables or API routes. No new design tokens, colors, or component variants
— every visual element referenced above (`Card`, `CardContent`, `Badge`, `Button`, `bg-gradient-brand`,
`text-gradient-brand`, `.glass`, `bg-ambient-glow`, `bg-surface`, `border-border`, Tailwind's stock
`scroll-mt-*`/`scroll-smooth`) already exists in the codebase today.

---

## 8. What I deliberately did not do

- **Did not delete or redirect `/features`, `/pricing`, `/about`** — see §1 for the real reasoning, not a
  default.
- **Did not build a scroll-spy / active-section highlighter.** The active-nav-link underline is a known,
  explicitly-flagged gap (§3), not silently dropped — worth a follow-up if the CEO wants "highlight the section
  I'm scrolled to," but it's new interaction complexity (`IntersectionObserver`) beyond this restructure's
  scope of "make it one scrolling page."
- **Did not touch `/faq`'s own content or route** — reused its `PRICING_FAQ`-adjacent content instead of
  merging `/faq` itself in; see §4 for exactly why "just copy `/faq`'s questions onto `/`" was the wrong call
  once the overlap with Pricing's own FAQ was accounted for.
- **Did not add scroll-spy, parallax, or any new animation/interaction library.** `scroll-smooth` +
  `scroll-mt-*` + plain `<Link href="/#section">` is the entire mechanism — standard Tailwind + standard
  Next.js App Router behavior, nothing installed.
- **Did not change any copy.** Every word on Features/Pricing/About is unchanged from the QA-approved
  `ba9001d` version; the only edits anywhere in this spec are two CTA `href` targets (§3) and one heading label
  ("Pricing questions" → "Frequently asked questions" for the exact same `PRICING_FAQ` array, only when
  rendered as `FaqSection`, §4) — not new marketing language.
