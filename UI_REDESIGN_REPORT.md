# UI Redesign Report — Premium Visual Pass

**Author:** Product
**Branch/worktree:** `claude/futureos-student-app-3ewdz6`, isolated worktree `agent-ad241ab4da61709c1`
**Runs in parallel with:** Dev's codebase audit and QA's full-app test (separate worktrees) — Cato reconciles afterward.

## Brief

CEO ask: make the UI look like it "came from 100,000 people web development/app development" — genuinely premium, professional-caliber, not incremental tweaks. Scope strategy mandated by Cato/CEO: tokens first (`globals.css`/`tailwind.config.ts`), then shared primitives, then only bespoke screen work if the token+primitive uplift doesn't already cover it.

## On Figma and Canva

The task authorized using Figma (with the `/figma-use` skill loaded first) and Canva. **In this execution session, no Figma or Canva tools were actually exposed to me** — my available tool set was Read/Write/Edit/Bash/Glob/Grep/WebSearch only, despite the environment's MCP server instructions describing Figma/Canva/GitHub/Railway/etc. capabilities in the abstract. I did not fabricate a Figma file, a file key, or a mockup link — per the team's No-BS rule, claiming a Figma design existed when it didn't would be worse than not having one.

Given that constraint, I did the design-system work directly in the token layer (documented below), with real visual verification substituting for a Figma mockup review (see Verification). No genuine need for custom Canva graphics/illustrations/icons emerged during this pass — every icon use in the touched screens is already covered by Lucide, consistent with the existing system.

If Figma access is restored in a future session, the highest-value next use of it would be validating the shadow/elevation and focus-ring system against a proper light/dark palette board before any further visual work, and mocking the deferred typography-scale consolidation (see below) before it's implemented in code.

## What I actually found (before deciding what to change)

Read `PROJECT_STATE.md` in full, then the existing design tokens (`globals.css`, `tailwind.config.ts`) and every shared primitive (`Card`, `Button`, `Badge`, `StatTile`, `RadialStat`, `ProgressBar`, `PriorityDot`, `EmptyState`, `Modal`, `Switch`, `Tabs`, `Avatar`, `SidebarNav`, `TopBar`, `BottomNav`), plus `StudentHome.tsx`/`BusinessHome.tsx`/`deadlines/page.tsx`/`school/exams/page.tsx`/`coach/page.tsx`.

Baseline assessment: the app already has real bones — a considered indigo→cyan brand gradient, a `.glass` translucent card treatment, `RadialStat` gradient rings, urgency-toned badges, and genuinely nice existing micro-interactions (sidebar hover translate, theme-icon rotate-on-hover, gradient active-tab pill). This is not a template starting from zero.

Two concrete, verifiable gaps, found by grep and confirmed visually:
1. **Zero keyboard focus states anywhere in the app.** Grepped `focus-visible|focus:|outline-none|ring-` across `src/` — no `:focus-visible` treatment exists on any interactive element. For a shipping product this is both an accessibility gap and a "this wasn't finished" tell.
2. **Light-mode cards read flat/undefined.** Light is the actual default users see (per `ThemeProvider`), and in light mode, `.glass` cards sit on a `220 22% 98%` background with almost no luminance gap and a barely-there single-layer shadow (`0 1px 3px / 0.3, 0 12px 32px -16px / 0.5` against a *pale* `--shadow-color: 220 25% 72%`). Screenshotted the real component tree before touching anything (see Verification) — cards, list rows, and buttons all visually blend into the page background. This is the single biggest "looks like a template" tell in the app and the main thing this pass fixes.

A third thing surfaced only once I started editing: **`.glass` was setting its own `box-shadow`, which silently overrode the `shadow-card` utility Tailwind class applied alongside it on every `Card`** (same CSS property, `.glass` sits later in the compiled stylesheet, so it always won). This meant the app's card elevation was effectively half-broken already — no design change I made would have been visible until I found and fixed this. Documented inline in `globals.css`.

## What I implemented

All changes are in the **tokens** and **shared primitives** layers per the mandated scope strategy; only two 1-line screen-level touches (both mechanical, both already-existing local constants).

**Tokens — `src/app/globals.css`, `tailwind.config.ts`:**
- **Elevation/shadow system overhaul.** Replaced every single-layer soft-blur shadow (`subtle`/`card`/`raised`/`pop`) with a multi-layer recipe (crisp near-shadow + soft diffuse far-shadow) — the near layer is what actually reads as "this surface is lifted," which was missing before. Added a new `float` tier: a neutral elevated hover shadow for cards that aren't inherently accent-branded (a career-progress tile or a CTA card shouldn't glow purple on hover just because it's clickable).
- **Light-mode `--shadow-color` deliberately enriched**, not just restructured: `220 25% 72%` → `224 32% 42%`. Light mode has almost no luminance gap between card and page to lean on (98% vs 100% lightness), so a literally-sampled pale shadow tint disappears at any reasonable opacity. This reads as a real lifted surface without looking heavy, and required fixing the `.glass` cascade bug above before it was even visible.
- **Fixed the `.glass`/`shadow-card` cascade collision** (see above) by introducing a new `--card-highlight` CSS variable (the classic glassmorphism top-edge highlight, themed per light/dark) and folding it *into* the shadow tokens (`card`/`raised`/`pop`/`float`) instead of `.glass` owning `box-shadow` directly. `.glass` now only sets background/border/backdrop-filter — never `box-shadow` — so it always composes correctly with whichever `shadow-*` utility a call site pairs it with, instead of fighting it.
- **Global `:focus-visible` ring** — a halo (background-colored gap + accent-colored ring) via `box-shadow`, not `outline`, so it automatically follows each element's own border-radius (pill buttons, circular avatars, rounded cards) instead of rendering as a mismatched rectangle. Zero JSX changes needed — this covers every interactive element in the app for free. Verified with real keyboard Tab navigation in the harness (see Verification).
- `.glass` refinement: increased blur (20px→24px) + added `saturate(160%)` for a more considered glass read, slightly stronger border opacity in both themes.
- Light-mode `--border` token nudged slightly stronger (`88%`→`85%` lightness) for a touch more card-edge definition.
- `text-wrap: balance` on `h1`/`h2`/`h3` — modern CSS for evenly-wrapped headings, gracefully ignored where unsupported.

**Shared primitives:**
- `Card.tsx` — added `transition-shadow duration-200` so any shadow-affecting state (hover, future interactive states) animates smoothly instead of snapping.
- `ProgressBar.tsx` — added a subtle inset track shadow (using the shadow-color token) for a "grooved" physical depth instead of a flat-fill bar.
- `RadialStat.tsx` — swapped the unfilled ring track from `stroke-muted` to `stroke-border` (previously nearly invisible against the card background, making rings look incomplete before any value filled in); added `tabular-nums` to the percentage readout so digit changes don't jitter the layout.
- `StatTile.tsx` — same `tabular-nums` treatment on its percentage value.

**Two mechanical screen-level touches** (both are edits to a pre-existing local `HOVER_LIFT` constant, not structural changes — no `col-start`/`row-start` touched, verified by grep before and after):
- `StudentHome.tsx`, `BusinessHome.tsx` — swapped the desktop hover-lift shadow from `shadow-glow-accent` to the new `shadow-float`, for the reason above (neutral elevation, not an accent glow, for non-accent-branded interactive cards).

## What I explicitly deferred, and why

- **Typography scale consolidation.** Grepped 49 arbitrary `text-[Npx]` usages scattered across ~30 files with no named scale. Real inconsistency, but fixing it means touching nearly every screen file for a mostly-cosmetic gain — exactly the "unreviewable, high-regression-risk diff" the brief warned against. The two shared components that *do* carry typography hierarchy broadly (`ScreenHeader`, `CardTitle`) were already reasonably considered (tracking-tight, sensible weights) and didn't need changes. Flagging this as a good candidate for its own dedicated pass, not bundling it into this one.
- **Border-radius scale.** Reviewed — 28-34px on cards is unusually large but consistent app-wide and part of the existing brand language (large pill buttons, rounded-3xl mission cards). Changing it is a structural redesign decision, not a token refinement, and conflicts with "extend the system, don't replace it."
- **Bespoke per-screen redesigns beyond the two `HOVER_LIFT` tweaks.** The token+primitive uplift alone visibly fixed the biggest issue (flat, undefined light-mode cards) on every screenshotted screen without touching screen-level layout or copy. Per my own guiding question — does this actually make the product better, or is it change for its own sake — I didn't find anything else that cleared the bar once the elevation fix landed. No Home restructuring, no new sections, no copy changes.
- **Figma/Canva mockups** — not available this session; see above.

## Verification methodology

There's no seeded Supabase session in this worktree, so the real authenticated app can't be screenshotted directly. Rather than reason about CSS in the abstract, I built a **real-component render harness**: bundled the actual `Card`, `Button`, `Badge`, `ProgressBar`, `RadialStat`, `StatTile`, `MissionHeroCard`, `EmptyState`, `ScreenHeader`, real Lucide icons, and the real `cn`/`deadlines` lib functions via `esbuild`, fed them representative mock data (standing in for the hooks these components normally get data from), rendered to static HTML via `react-dom/server`, compiled through the **actual** `tailwind.config.ts` + `globals.css` (not approximated classNames), and screenshotted with Playwright/Chromium at 390px and 1280px, light and dark, before and after every change, for: Home (student), Home (business), a School subsystem page (Exams), Deadlines, and Coach. This mirrors the harness methodology QA used in the prior UI initiative (see `PROJECT_STATE.md`), extended here to cover both themes and both tracks.

This is how the `.glass`/`shadow-card` cascade bug above was actually caught — my first token edit produced a visually near-identical screenshot, which sent me back into the compiled CSS to find the real cause rather than assuming the change had "worked" from the diff alone.

Also verified the new `:focus-visible` ring with real keyboard `Tab` navigation in the harness (not just visual inspection) — confirmed via `document.activeElement` plus a screenshot that the ring renders correctly and follows the focused pill's own border-radius.

All harness files lived in a git-ignored, untracked `.harness-tmp/` directory at the repo root for the duration of the session and were deleted before the final `tsc`/build/commit — none of it is part of this commit; `git status` is clean apart from the 8 intentional source files below.

## Files changed

- `src/app/globals.css` — tokens (shadow-color, card-highlight, border), focus-visible, glass fix, text-wrap
- `tailwind.config.ts` — shadow scale overhaul, new `float` tier
- `src/components/ui/Card.tsx` — transition-shadow
- `src/components/ui/ProgressBar.tsx` — inset track shadow
- `src/components/shared/RadialStat.tsx` — track color, tabular-nums
- `src/components/shared/StatTile.tsx` — tabular-nums
- `src/app/app/StudentHome.tsx` — HOVER_LIFT shadow token swap (1 line)
- `src/app/app/BusinessHome.tsx` — HOVER_LIFT shadow token swap (1 line)

## Build/type verification

- `npx tsc --noEmit` — clean, run directly, after the harness dir was deleted.
- `npx next build` — clean, all 42 routes compiled/prerendered, run directly, after the harness dir was deleted.

## Hard constraints — confirmed not regressed

- **CSS Grid dashboards**: grepped `col-start`/`row-start` in `StudentHome.tsx`/`BusinessHome.tsx` before and after — identical, every grid item still has both, paired. Nothing in this pass touched grid positioning, only a shadow token name inside an already-existing local constant.
- **Mobile**: nothing in this pass is layout-affecting — every change is a color/shadow/token/transition value. Verified at 390px in the harness for all 5 screens, both themes; no overflow/wrap/misalignment.
- **Both themes**: every token change was written for both `:root` (dark) and `.light`, and every harness screenshot was taken in both themes before and after.
- **No functionality touched**: no data logic, routes, or track-architecture changes. Confirmed via `git diff` — the full diff is 8 files, all CSS/token/className changes.
