# De-Vibe Audit — Alxioum Visual Craft Redesign Spec

**Author:** Product
**Date:** 2026-09-03
**Status:** Spec for Dev to implement. No code changed by this document.

## 0. Why this audit, and how it was done

The CEO has said, repeatedly, that Alxioum "looks vibe coded" — most recently right after
`5f6fac3` ("Polish landing page visual craft: depth, hierarchy, and micro-interactions"),
a pass that added `shadow-glow-accent` hover treatments and gradient-wash backgrounds to
feature cards, pricing cards, and CTA sections, and was described in its own commit message
as making the page more "premium."

That pass is **not** what fixed the vibe-coded feeling — by the actual definition of the
term, it's an instance of it. "Vibe coded" doesn't mean "looks unfinished." It means:

1. Gradients/glows applied in places that don't need them, decoratively rather than to
   communicate anything.
2. Multiple saturated, competing colors on screen at once, especially on dark backgrounds.
3. The generic "AI app" look — muted palette + one brand accent + system sans-serif +
   rounded-corners-and-shadows on everything, applied so evenly that nothing is emphasized
   over anything else. Real sophistication comes from restraint and genuine information
   hierarchy (what's said in bigger/bolder/first vs. smaller/quieter/later), not more effects.
4. Polished surface, inconsistent functionality underneath.
5. The same icon-in-a-circle decorative unit repeated everywhere with no variation.

This document audits the actual codebase — component by component, file and line — against
those five criteria, across both the public marketing site and the authenticated product.
Every finding below is a real, currently-shipping pattern, not a hypothetical.

**Method:** Read `globals.css`, `tailwind.config.ts`, all of `src/components/ui/*`, the full
marketing component set, and the shared app-shell components (`SidebarNav`, `BottomNav`,
`TopBar`, `ScreenHeader`, `Card`/`Button`/`Badge`/`ProgressBar`), plus `StudentHome.tsx` and
`BusinessHome.tsx` in full as representative authenticated screens. Cross-checked every
finding with `grep` across the whole `src/` tree to get real counts, not impressions, then
ran the app with Playwright (Chromium, 1440px and 390px, light and dark) against the
current landing page — screenshots confirmed the code-level findings below (18 identical
feature cards, three stacked ambient-glow blooms down the scroll, the hero's two competing
saturated gradients side by side).

**One disclosed gap:** I was not able to get Playwright-driven, fully-authenticated
screenshots of Home/School/Future/Coach/Profile in this session — the sandbox's egress
proxy explicitly denies (403, policy) the browser's CONNECT to the Supabase host, which
`supabase-js` needs for both auth and every data read, so a real signed-in session can't
render in this browser instance. Per the proxy's own guidance this is a policy denial to
report, not something to route around. I did not fabricate authenticated screenshots to
paper over this. In its place, this audit reads `StudentHome.tsx` and `BusinessHome.tsx`
in full (both are reproduced/quoted below with line numbers) and cross-references every
shared component they import, which is a reliable substitute for the *code and class-level*
findings this document makes, but it means the authenticated-screen findings below are
verified by reading rendered JSX/Tailwind classes, not by looking at a rendered screenshot.
Dev/QA should screenshot the real authenticated app once these fixes land, same as any
other change.

---

## 1. Headline finding: the glow is not a landing-page problem, it's a global default

The most important thing this audit found is that `shadow-glow-accent` /
`shadow-glow-mission` are not "a hover effect added to the landing page." They are baked
into `Button`'s **default, resting-state** styling for the `primary` and `mission`
variants:

```
// src/components/ui/Button.tsx:14-18
primary: "bg-gradient-brand text-white shadow-glow-accent hover:brightness-110",
mission: "bg-gradient-mission text-white shadow-glow-mission hover:brightness-110",
```

Every `<Button>` call site that doesn't explicitly pass `variant="secondary"|"ghost"|
"outline"|"danger"` gets a permanent colored glow shadow, all the time, not on hover, not
tied to any state change. `grep` finds **52 call sites** using the implicit/explicit
`primary` default. Beyond `Button`, the literal class string `shadow-glow-accent` or
`shadow-glow-mission` appears **57 times across 36 files** — nav active-states, filter
pills, logo marks, icon chips, mission cards, empty states, paywalls, achievement toasts.
None of these are "one important moment, emphasized." All of them are.

That's the textbook version of grounding criterion #1 ("glow shadows applied
decoratively rather than functionally") — and it's true of the *whole app*, not just the
recent landing pass. The recent pass (§4 below) made it worse on one page; it didn't
introduce the underlying pattern.

**Fix, in priority order, is §2 below.** Read that before anything else in this document —
it's the highest-leverage, lowest-risk change available, because it lives almost entirely
in shared primitives (`Button.tsx`, `tailwind.config.ts`) rather than requiring N
page-by-page edits.

---

## 2. Fix: retire ambient glow as a default; keep it (rarely) as an earned effect

### 2.1 `Button.tsx` — remove the glow from the base variant

**Before:**
```tsx
const variantClasses: Record<Variant, string> = {
  primary:
    "bg-gradient-brand text-white shadow-glow-accent hover:brightness-110",
  mission:
    "bg-gradient-mission text-white shadow-glow-mission hover:brightness-110",
  ...
```

**After:**
```tsx
const variantClasses: Record<Variant, string> = {
  primary:
    "bg-gradient-brand text-white shadow-raised hover:brightness-110",
  mission:
    "bg-gradient-mission text-white shadow-raised hover:brightness-110",
  ...
```

`shadow-raised` already exists in `tailwind.config.ts` (`boxShadow.raised`, line 94) — it's
the same multi-layer, achromatic "crisp near-shadow + soft diffuse far-shadow" recipe the
design system already uses elsewhere for real elevation. It reads as "this button is
lifted," which is what a button actually needs to communicate — not "this button is
radioactive." The gradient fill itself (`bg-gradient-brand`) stays exactly as-is: that's
brand identity, not vibe-coding, and this fix does not touch it.

This single change fixes, with zero page-level edits: every default-primary button across
onboarding, signup, login, upgrade, missions, and every "Get Started"/"Create account"/
"Log in" CTA in the app (52 call sites) plus every mission-variant button.

### 2.2 Kill the remaining 57 literal `shadow-glow-accent`/`shadow-glow-mission` class
strings — but not uniformly. Split by what they're actually doing:

**(a) Purely decorative, on static/non-interactive elements — remove outright, no
replacement:**
- `LogoMark` glow on `StaticContentPage.tsx:25`, `LoadingScreen.tsx:45`,
  `forgot-password/page.tsx:54,58`, `error.tsx:33`, `not-found.tsx:16`,
  `reset-password/page.tsx:221`, `signup/SignupClient.tsx:272`, `login/LoginClient.tsx:63`,
  `(public)/page.tsx:88`. Nine places where a small static app logo — never clicked, never
  hovered, nothing happens to it — has a permanent colored blur-shadow. This is the purest
  form of "glow applied decoratively, not functionally": there is no function for it to
  serve. Remove the class; the `LogoMark` mark itself (the gradient triangle) already reads
  as branded without a shadow under it.
- `AchievementToast.tsx:16` icon chip, `NewUserTutorial.tsx:111` step icon,
  `PaywallGate.tsx:37` lock icon, `missions/[id]/page.tsx:59` (via `shadow-glow-mission`),
  `future/[slug]/page.tsx:67`. Same reasoning — static icon-in-chip, no state change, no
  interaction. Remove the shadow; keep the gradient chip.

**(b) Selection/active-state indicators — replace glow with a flat, higher-contrast fill,
no shadow:**
- `SidebarNav.tsx:47`, `BottomNav.tsx:35`, `SchoolSubNav.tsx:31`, `RoadmapTimeline.tsx:32`,
  `SelectableCard.tsx:35`, and all the quiz/flashcards/exam-mode filter pills
  (`school/quizzes/page.tsx` ×5, `school/quizzes/exam-mode/page.tsx` ×7,
  `school/flashcards/page.tsx` ×4). These use the glow to say "this is currently selected."
  A solid, high-contrast fill (`bg-gradient-brand text-white`, which they already have)
  already communicates "selected" through color and contrast against the unselected
  `bg-muted text-muted-foreground` siblings. The added blur-shadow contributes nothing a
  color-contrast difference doesn't already provide, and multiplied across a 5-in-a-row
  filter-pill row (e.g. `exam-mode/page.tsx`'s subject/exam/material/count/difficulty
  pickers) it reads as "everything is glowing," not "this one thing is selected." Drop
  `shadow-glow-accent`/`shadow-glow-mission` from the `active`-state branch of every one of
  these; keep the fill.

**(c) The one legitimate "this is THE one" moment — earn it explicitly, don't default to
it:**
- `PricingSection.tsx:182`, the live "Alxioum Plus · Student" tier card. This is the one
  place in the whole app where the code comment (`PricingSection.tsx:174-179`) actually
  reasons about *why* glow is warranted: it's the single live paid tier among three cards,
  already carrying a "Live now" badge, already raised (`md:-translate-y-3`), already
  color-washed. Keep this one. But even here, drop the glow-shadow layer and let the
  `-translate-y-3` lift + `border-accent/50` + badge carry the emphasis — test it without
  `shadow-glow-accent` first; if it genuinely reads as flat once the ambient-glow pass in
  §3 below is also removed, it's the *one* place in the whole codebase allowed to keep it,
  not a pattern to reuse anywhere else.

**Net effect:** of 57 current call sites, ~53 lose the glow entirely (a) or get replaced
with flat color-contrast (b); at most 1-2 keep it as a genuinely singular emphasis (c). This
is the single highest-impact, lowest-risk fix in this document — it's a handful of shared
primitives plus a mechanical find/remove pass, not a redesign.

### 2.3 Retire the corner-blob glow as a default card treatment

Four separate places use the exact same decorative technique — a blurred, ~20-25%-opacity
circle of `bg-gradient-brand`/`bg-gradient-mission` positioned in a card's top-right corner:

- `FeaturesSection.tsx:218` (AI Coach card): `h-64 w-64 ... opacity-20 blur-3xl`
- `PricingSection.tsx:191` (featured pricing card): `h-40 w-40 ... opacity-25 blur-3xl`
- `StudentHome.tsx:115` (desktop RadialStat card): `h-32 w-32 ... opacity-20 blur-2xl`
- `BusinessHome.tsx:76` (desktop RadialStat card): `h-32 w-32 ... opacity-20 blur-2xl`

Four instances of one idea, applied identically regardless of context, is decoration, not
emphasis (criterion #1 again, plus criterion #3's "statistically average AI aesthetic" —
this exact "blurred gradient blob in the corner of a card" is one of the most recognizable
generic-AI-app tropes). **Remove all four.** The RadialStat cards on Home already carry
real information (two progress rings + a streak count) and don't need an ambient blob to
look finished; the AI Coach and featured-pricing cards already have a gradient-wash
background layer doing the same "this card is special" job — the blob is a second, redundant
signal on top of a first one.

### 2.4 Retire `bg-ambient-glow` as a recurring page-load default; keep it as a true
landing-page-only device

`bg-ambient-glow` (a radial `hsl(var(--accent)/0.18)` bloom, `globals.css:210-220`) is used
in **12 files**, including every single authenticated Home load
(`StudentHome.tsx:81`, `BusinessHome.tsx:44`), both onboarding flows, `choose-plan`,
`LoadingScreen`, `error.tsx`, `not-found.tsx` — in addition to the landing page, where it's
stacked **three times down one scroll** (Hero at `(public)/page.tsx:79`, Features at
`FeaturesSection.tsx:194`, Pricing at `PricingSection.tsx:101`, plus a fourth conditional
one on About when inline, `AboutSection.tsx:47`).

Two different problems here:

1. **On the landing page:** four radial blooms in one scroll is no longer a hero moment,
   it's wallpaper — Playwright screenshots of the live page confirm each section's heading
   sits inside a visibly repeated purple halo, so by the time a visitor reaches "About" the
   effect has stopped meaning anything. **Fix:** keep `bg-ambient-glow` only behind the
   Hero (`(public)/page.tsx:79`). Remove it from `FeaturesSection`, `PricingSection`, and
   `AboutSection` entirely (delete the `<div className="bg-ambient-glow" .../>` lines and
   the now-unused `withSectionBreak`/`sectionBreak` glow branch) — the plain
   `border-t border-border` divider they already have is enough of a section break on its
   own. One glow, one time, at the top of the page, is a real "welcome" moment. Four is
   noise.
2. **In the authenticated app:** a returning user sees the exact same "ambient glow behind
   the greeting" treatment every single time they open Home, on both tracks. Glow that
   appears unconditionally on every page load isn't emphasizing anything — there's nothing
   being contrasted against, since it's the *only* thing that ever renders there. **Fix:**
   remove `bg-ambient-glow` from `StudentHome.tsx:81` and `BusinessHome.tsx:44`. Let the
   greeting's own `text-gradient-brand` on the user's first name (already present, already
   sufficient brand-color presence) carry the "this is a warm, branded space" job without
   an additional background effect competing with the actual content (the day's plan,
   directly below it) for attention.

---

## 3. Fix: the palette has seven competing saturated hues — cut it to a functional set

Grounding criterion #2 is "competing neon/high-chroma colors on dark backgrounds." Reading
the actual HSL values in `globals.css:22-41` (dark, the values light mode is a desaturated
echo of) shows this isn't a vague impression — the token set defines **seven** distinct
hues, all at 78-92% saturation and 58-68% lightness (i.e., all "neon-adjacent" by any
reasonable definition):

| Token | Hue | Sat/Light | Reads as |
|---|---|---|---|
| `--accent` | 252° | 92%/68% | violet/indigo |
| `--accent-end` | 186° | 84%/58% | cyan |
| `--mission-from` | 14° | 92%/62% | coral/orange-red |
| `--mission-via` | 336° | 82%/62% | magenta/pink |
| `--mission-to` | 262° | 78%/62% | purple |
| `--school` | 206° | 90%/60% | blue |
| `--future` | 28° | 92%/60% | orange |

`StudentHome.tsx:113-126` puts three of these families on screen in one card cluster at
once: the desktop hero widget renders a `RadialStat` in `school` (blue) tone next to one in
`future` (orange) tone, directly beside a `MissionHeroCard` using the full
coral→magenta→purple `mission` gradient (`MissionCard.tsx:9`) — three unrelated
multi-hue gradients touching in a ~300px-wide area, on every single Home load, on both
tracks (`BusinessHome.tsx` does the same with `bg-gradient-mission` in place of the
`RadialStat` glow). That's criterion #2, verified with the actual numbers rather than "it
feels busy."

**Fix — do not invent new colors, cut usage of the ones that exist:**

1. **Retire the `mission` gradient (coral→magenta→purple) as a Home-screen default.**
   It's the single most saturated, most attention-grabbing gradient in the whole system
   (three hues, not two, unlike `accent`), and it currently fires on every Home load for
   every user (`MissionHeroCard`/`MissionCard`, `StudentHome.tsx:130`,
   `missions/[id]/page.tsx:59`). Reserve the full `mission` gradient for the actual mission
   *detail* screen (`missions/[id]/page.tsx`) — where a user has intentionally navigated in
   to look at one specific mission, and "this is a special, rewarding moment" is true — and
   replace the Home-screen `MissionHeroCard` with a flat `bg-surface border border-border`
   card that uses a single `text-mission-via` (pick one hue, not the three-stop gradient)
   accent for the "+XP" badge and eyebrow label only. Home already has three other brand
   colors in view (accent gradient in the greeting, school blue, future orange) — it
   doesn't need a fourth, louder one competing for the same glance.
2. **`school` and `future` stay** — they're functional, not decorative: they're the two
   fixed categories the whole app is organized around (the two `RadialStat`/`StatTile`
   tones on every Home, the two nav-adjacent domains), and a user needs to be able to tell
   "this number is about School" from "this number is about your Future/Grow track" at a
   glance. That's a real information need a color distinction correctly serves. Keep both,
   unchanged.
3. **`accent`/`accent-end` (the violet→cyan brand gradient) stays** as the one true brand
   mark — used for the wordmark, the one primary CTA per screen, and nothing else once §2
   above removes it from nav pills, logo marks, and static icon chips.

Net: from seven competing saturated hues in simultaneous use down to three
(`accent`/`accent-end` as one brand gradient, `school`, `future`), each with a distinct,
non-overlapping job. `mission` still exists as a token and still gets used, just not as a
default that fires on every page load.

---

## 4. Fix: the landing page's "premium pass" — evaluate against the criteria, don't assume
it was correct

This is the pass the CEO's complaint followed directly, so it gets called out by name.
Reading `5f6fac3`'s own commit message against the five criteria:

- *"icon chips now light up with `shadow-glow-accent` on hover instead of being static flat
  squares"* (`FeaturesSection.tsx:145`) — this is criterion #1 exactly: a glow added
  because static-vs-glow reads as "more premium," not because anything about that specific
  icon needed emphasizing. All 18 feature-card icon chips get it identically on hover.
  **Remove.** Per §2.1/2.2, hover feedback on a feature card should come from the card-level
  `HOVER_LIFT` treatment it already has (`-translate-y-1`, `shadow-float` — both
  achromatic), not a second, colored effect stacked on top of the icon inside it.
- *"AI Coach card and the closing CTA card gained ambient glow/gradient-wash backgrounds
  for depth"* — covered in §2.3/2.4 above; both the corner-blob and the ambient-glow
  version get removed from these two cards specifically for the reasons given there.
- *The featured pricing card's `shadow-glow-accent` + gradient-wash* — this is the one
  case (§2.2(c)) with an actual reasoned justification in the code, so it's the one
  candidate for keeping *something*, tested without the glow first.

**Verdict:** dial this pass back significantly, not forward. It added five different glow/
gradient-wash treatments to one page in one commit; per the criteria this session was
explicitly given to apply, that reads as *more* vibe-coded, not less, regardless of the
commit message's own "premium" framing. "Premium" is not a synonym for "more visual
effects" — the fixes in §5 (real hierarchy, real differentiation between the 18 feature
cards) are what will actually move this page from "generic AI app" to "considered
product," not another layer of glow.

---

## 5. Fix: 18 identical feature cards is the "statistically average AI aesthetic," verbatim

`FeatureGrid` (`FeaturesSection.tsx:137-156`) renders `STUDENT_FEATURES` (12 items,
`FeaturesSection.tsx:39-102`) and `BUSINESS_FEATURES` (6 items, `FeaturesSection.tsx:
104-135`) through one shared card template:

```tsx
<Card key={item.title} className={cn("group", HOVER_LIFT)}>
  <CardContent className="p-5">
    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-subtle ...">
      <Icon className="h-4 w-4" />
    </span>
    <p className="mt-4 text-body font-bold text-foreground">{item.title}</p>
    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
  </CardContent>
</Card>
```

Eighteen cards, identical shape, identical icon-chip treatment, identical type scale — the
*only* thing differentiating any one of them from any other is which of eighteen Lucide
glyphs sits inside the identical chip. A Playwright screenshot of the rendered `/` page
confirms this reads exactly like it sounds: a uniform 3-column grid where nothing draws the
eye anywhere in particular, which is the single clearest example of grounding criterion #3
found anywhere in this codebase (this is genuinely, verbatim, "the same icon-in-a-circle
pattern repeated identically everywhere with no variation or purpose" from criterion #5 too
— it's both).

Twelve is also, on its own terms, too many things to present as equally important in one
scroll — a visitor cannot hold "Timetable, Homework tracking, Exams & readiness, Weekly
study plan, AI study plans, Flashcards, AI-generated quizzes, Weak topics, Career matches,
Future Map, Weekly review, XP/streaks" as twelve equally-weighted facts. Real hierarchy
means deciding what matters most and saying so visually, not listing everything at equal
volume.

**Fix — not a redesign, a differentiation pass on the existing template:**

1. **Pick 3 "headline" features per track** (not 12/6) to visually promote — the ones that
   most differentiate Alxioum from a generic to-do app: for student, `AI study plans`,
   `Weak topics`, `Career matches` are the three that couldn't exist in a plain checklist
   app. For business, `AI business snapshot`, `Metrics log`, `AI content helper`.
2. Render those 3 in a **larger card** (spans 2 grid columns on `lg:`, i.e.
   `lg:col-span-2` on a 3-col grid, or simply a taller card with the description visible at
   `text-sm` instead of truncated) with the icon rendered at `h-5 w-5` directly in
   `text-accent` — **no background chip at all**. No chip is the differentiator here: a
   plain colored icon reads as "considered, minimal" specifically *because* everything
   around it has a chip; giving all 3 headline cards the plain-icon treatment while every
   other card keeps the chip creates the actual hierarchy this section needs.
3. Render the remaining 9/3 features in a **denser list, not a card grid** — e.g. a 2-column
   list of icon + title + one-line description (no full `Card` wrapper, no `CardContent`
   padding, just a `flex items-start gap-3 py-3 border-b border-border/50` row). This does
   three things at once: it's visually distinct from the 3 promoted cards above it (so the
   page has two tiers, not one flat tier of 12), it takes roughly half the vertical space
   the current 12-card grid takes (less scrolling to reach Pricing/About/FAQ), and it drops
   9 more identical icon chips from the page, directly reducing the criterion-#5 repetition
   this section is currently the worst offender for.
4. Keep the icon chip (`bg-gradient-brand`, no shadow per §2.2) **only** on the 3 promoted
   cards' siblings-that-are-list-rows should use a plain `text-muted-foreground` icon with
   no chip at all — reserving the branded chip treatment for the tier that's actually meant
   to stand out.

This is the single highest-effort fix in this document, but also the one most directly
responsible for the "looks like every other AI-built landing page" reaction — a 3-tall/
9-list split with real size and treatment differences is what an actual product marketing
site (not a feature-parity spec sheet) looks like.

---

## 6. Fix: four sibling headings rendered identically erases the page's structure

`grep` for the literal class string `text-heading font-extrabold tracking-tight
text-foreground` (26px/800) returns **7 hits across the marketing components**:
`AboutSection.tsx:50` (About's own main heading), `FaqSection.tsx:21` ("Frequently asked
questions"), and — critically — `FeaturesSection.tsx:208` ("Student track"),
`FeaturesSection.tsx:226` ("A coach that actually knows what's on your plate"),
`FeaturesSection.tsx:240` ("For founders"), `FeaturesSection.tsx:257` ("Pick your track.
We'll build around it."), `PricingSection.tsx:253` ("Pricing questions").

Five of those seven are **subsections one level below** a section's own main heading
("Student track" and "For founders" are subheadings inside Features; the AI Coach headline
is a card headline inside Features; the closing CTA is inside Features too). They render at
the exact same size and weight as top-level section headings like "Frequently asked
questions." A reader scanning the page cannot tell, from typography alone, that "Student
track" is a subordinate label inside a bigger section while "Frequently asked questions" is
a section in its own right — they're printed identically. This is exactly what the task
brief means by "differentiate H2 from H3 by weight not just size" — here it's worse, they're
not even differentiated by size, both size *and* weight are identical regardless of nesting
depth.

**Fix — concrete values, not "improve hierarchy":**

- Keep top-level section headings (`FeaturesSection`'s own `<Heading>`, `PricingSection`'s
  own `<Heading>`, `FaqSection`'s `<h2>`) at `text-display` (34px) / `font-extrabold` (800)
  — these are correctly the biggest thing on the page already.
- **`AboutSection`'s own main heading is currently `text-heading` (26px)** — smaller than
  its two siblings (`text-display`, 34px). Fix: change `AboutSection.tsx:50` to
  `text-display font-extrabold` to match Features/Pricing. Three sections that are equal
  citizens in the page's structure should look like equal citizens.
- **Introduce a real, smaller subsection tier.** Add a new Tailwind `fontSize` token,
  `subsection: "19px"`, next to the existing `heading: "26px"` in `tailwind.config.ts`. Use
  `text-subsection font-bold` (700, not 800) for anything that is a heading *inside* a
  section rather than the section itself: `FeaturesSection.tsx:208` ("Student track"),
  `:240` ("For founders"), `AboutSection.tsx`'s three subheadings (currently
  `text-body font-bold`, i.e. 15px — also fine to leave, they're clearly a third, smaller
  tier already and that's correct). This makes the actual page structure — section > 
  subsection > card — visible in the type, which is what a heading hierarchy is *for*.
- **Card-level and CTA-level headlines drop out of the heading scale entirely.** The AI
  Coach card's headline (`FeaturesSection.tsx:226`, currently an `<h3>`) and the closing
  "Pick your track" CTA (`FeaturesSection.tsx:257`, currently an `<h2>`) are promotional
  copy inside a card, not structural section headings — keep their semantic tag (still
  needs to be a real heading level for a11y, non-skipping per the existing QA-verified
  hierarchy work) but drop their *visual* size to `text-heading` (26px, one step down from
  `text-display`) while keeping `font-extrabold` — this is the one place identical
  treatment across two different contexts (a card headline and a page's closing pitch) is
  actually fine, because both genuinely are "the single most important sentence in this
  card," which the weight should communicate.

---

## 7. Fix: the dashboard's own heading hierarchy is inverted

`StudentHome.tsx` and `BusinessHome.tsx` (same pattern in both, confirmed by reading both
files in full) render, top to bottom:

1. `<h1>` — the "Good morning, {name}" greeting — `text-title font-bold` (22px) on mobile,
   `lg:text-title-lg` (28px) on desktop. (`StudentHome.tsx:84`)
2. `<h2>` — "Today's Plan" — `text-sm font-bold uppercase tracking-wide text-muted-foreground`
   (**14px**). (`StudentHome.tsx:136`)
3. `CardTitle` equivalent inside the day's plan / exam / homework cards — not actually used
   here, but the shared `CardTitle` primitive (`Card.tsx:21`) is `text-body font-semibold`
   (**15px**).

The `<h2>` (14px) is smaller than the card-level content below it (15px), and it's styled
identically to a form-field label or an eyebrow caption (uppercase, muted-foreground,
tracking-wide) rather than as a heading. A user scanning the page has no typographic signal
that "Today's Plan" is a section header one level below the page's own `<h1>` — it reads as
a small caption sitting above unrelated content.

**Fix, concrete:**
- Change `StudentHome.tsx:136` and `BusinessHome.tsx`'s equivalent from `text-sm font-bold
  uppercase tracking-wide text-muted-foreground` to `text-base font-bold text-foreground`
  (16px, not uppercase, not muted — a real heading color/weight, not a caption treatment).
  Keep the "School →" link next to it exactly as-is (`text-xs font-semibold text-accent`
  already correctly reads as a small secondary action, not competing with the heading).
- This is a two-line change (`StudentHome.tsx:136`, the equivalent line in
  `BusinessHome.tsx`) that fixes a genuine, measurable hierarchy inversion (child > parent
  in rendered size) rather than a subjective "make it feel more premium" note.

---

## 8. What NOT to change (say this explicitly, per the No-BS rule)

- **`Modal.tsx` and `Tabs.tsx`** (`src/components/ui/`) are already restrained — flat
  surfaces, `shadow-pop`/`shadow-subtle` (both achromatic), no glow, no gradient-wash, clear
  size/weight differentiation between title and description. These are the reference for
  what "already correct" looks like elsewhere in this codebase; nothing here needs touching.
- **The brand gradient itself** (`bg-gradient-brand`, `text-gradient-brand`, violet→cyan)
  stays exactly as it is, on the wordmark, on the one primary CTA per screen, and on the
  user's first name in the Home greeting. This audit is about where and how often it's
  used, never about removing it — Alxioum's brand identity is not the problem.
- **`school`/`future` tone colors** stay unchanged (§3) — they're doing real information
  work, not decoration.
- **The multi-layer `shadow-card`/`shadow-raised`/`shadow-pop`/`shadow-float` recipe**
  (`tailwind.config.ts:86-99`) is a genuinely well-reasoned piece of craft already (the
  code comment explains *why* a single soft blur reads flat and a crisp-near +
  soft-far combination reads as real elevation, especially in light mode) — every fix in
  this document that removes a colored glow replaces it with one of these tokens, never
  with "no shadow at all." Depth stays; color-tinted decoration goes.

---

## 9. Priority-ordered fix list (for Dev)

1. **`Button.tsx` variant classes** (§2.1) — swap `shadow-glow-accent`/`shadow-glow-mission`
   for `shadow-raised` on the `primary`/`mission` variants. Highest leverage, lowest risk,
   fixes 52 call sites with a 2-line diff.
2. **Retire `shadow-glow-*` from static/decorative uses** (§2.2a) — 9 logo marks + 5 static
   icon chips, straightforward class removal, no layout risk.
3. **Retire `shadow-glow-*` from selection/active states** (§2.2b) — nav pills, filter
   pills, `SelectableCard`, `RoadmapTimeline`; replace with the existing flat-fill treatment
   they already have minus the shadow class.
4. **Remove the 4 corner-blob instances** (§2.3) and **reduce `bg-ambient-glow` to
   Hero-only on `/` + remove from both authenticated Home screens** (§2.4) — biggest visual
   change for the least code risk; both are single-line/few-line deletions per file.
5. **Retire `MissionHeroCard`'s full 3-stop gradient from Home; reserve it for the mission
   detail screen** (§3.1) — the one color-palette fix requiring a small new component
   variant (flat card + single accent color), not just deletion.
6. **Fix `AboutSection`'s undersized main heading + introduce the `subsection` (19px) type
   tier and apply it to Features' "Student track"/"For founders"** (§6) — a config change
   (`tailwind.config.ts`) plus ~4 class-string swaps.
7. **Fix the dashboard's inverted `<h2>` ("Today's Plan")** (§7) — a 1-line class change in
   two files, cheap, fixes a real (not cosmetic) hierarchy bug.
8. **Differentiate the 18 feature cards into a 3-promoted / 9-list split** (§5) — the most
   design and implementation effort in this document, but the fix most directly responsible
   for the "generic AI landing page" reaction. Should follow, not block, items 1-7 — those
   are cheap and immediately reduce the glow/repetition problem everywhere at once; this one
   is a real content-hierarchy decision that benefits from the noise being gone first so
   it's judged on its own layout, not fighting eighteen identical glowing chips around it.

---

## 10. Note on scope discipline

Every fix above targets `src/components/ui/*`, `src/components/shared/*`,
`src/components/marketing/*`, `tailwind.config.ts`, or a handful of named lines in
`StudentHome.tsx`/`BusinessHome.tsx`/`FeaturesSection.tsx`. Nothing in this document asks
for a new component library, a new type scale from scratch, a new color, or a rewrite of
any screen. That's deliberate — per the brief, changes belong at the shared-primitive layer
plus targeted, named fixes, not a wholesale redesign. Dev should be able to implement this
spec file-by-file against the section numbers above.
