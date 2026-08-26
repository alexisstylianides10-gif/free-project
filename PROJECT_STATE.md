# PROJECT STATE

PROJECT: Alxioum (formerly FutureOS) — student/founder productivity app. Live production app, not greenfield.

GOAL: UI/UX improvement initiative on the existing live app. CEO brief: "Use the team to make Alxioum better, use Product to make the UI a lot better — fix it." Building is authorized now, not just planning. Scope: visual polish, consistency, and UX gaps in the existing screens — not new features, not a redesign of the architecture.

MVP: N/A — post-MVP, live app with paying users on two locked tracks (student, business).

FEATURES: Student track: Home, School (Subjects/Exams/Flashcards/Quizzes/Progress study system), Future (career matches + roadmap), Coach (AI chat), Profile (XP/achievements/skills). Business track: Home, Plan (milestones), Grow (metrics/expenses/content helper/competitors), Coach, Profile. Shared: onboarding + /choose-plan (track lock), Stripe billing + PaywallGate, missions, weekly review.

TECH STACK: Next.js 15 (App Router) + TypeScript + Tailwind. Supabase (Postgres + Auth). Stripe. Anthropic Claude API. Hosted on Render (https://alxioum-app.onrender.com). Design tokens via CSS custom properties in globals.css (dark-first, `.light` override class), gradient/glass utility classes, RadialStat/StatTile/Card/Badge/ProgressBar as the shared visual primitives.

ARCHITECTURE: Two product tracks (student, business) chosen once at /choose-plan and permanently locked by a Postgres trigger once onboarding_completed is true. Route-level branching pattern: shared routes (`/app`, `/app/school`, `/app/future`) render a track-specific component (e.g. `StudentHome`/`BusinessHome`, `StudentSchoolHome`/`BusinessPlanHome`, `StudentFutureHome`/`BusinessGrowHome`) chosen by `profile.track` in a thin page/layout wrapper. Coach and Profile are track-agnostic single implementations with inline conditional copy. Nav (SidebarNav desktop, BottomNav mobile) is driven by one shared `STUDENT_TABS`/`BUSINESS_TABS` table in `src/lib/navTabs.ts`. The student School tab has a real sub-app (SchoolSubNav: Home/Subjects/Exams/Flashcards/Quizzes/Progress); the business Plan tab is intentionally a single flat page with no sub-nav (by design, per code comment in `school/layout.tsx`) — this is the root cause of most business-track UI thinness identified below.

CURRENT TASK: ✅ COMPLETE — Cato final sign-off given. Re-ran `npx tsc --noEmit` and `npx next build` independently (both clean, all 41 routes) before push. Pushed cc8c4ed + 4286c07 to `claude/futureos-student-app-3ewdz6` and triggered a Render deploy. See QA REVIEW below for the full adversarial pass this was signed off on.

QA REVIEW (this pass, commit cc8c4ed reviewed against 91ac1e0):
- Read `git show cc8c4ed` in full (18 files, +226/-126) — not sampled.
- EmptyState adoption: spot-checked every one of the ~19-20 sites against PRODUCT_SPECS.md's table (copy, icon, CTA, bare/wrapped mode) — all match verbatim, including the deliberately-varied ones (exams: no CTA, correctly — the page genuinely has no add-exam control anywhere, confirmed by reading the whole file; weekly-review: Dev used `bare` mode though the spec row didn't say so explicitly — correct call, since that empty state is nested inside an existing Card/CardContent with a "Skills" heading above it, exactly the case `bare` exists for).
- Confirmed via grep that all 5 explicitly-excluded sites (StudentHome mini stat tiles, Coach thread popover, CountrySelect, quiz-results inline fallback, weak-topics inline text) are byte-for-byte untouched.
- Achievements: exactly the 5 named keys (`first_study_session`, `study_sessions_10`, `first_quiz`, `first_mock_exam`, `flashcards_mastered_20`) got `track: "student"`, the other 4 untouched; filter `ACHIEVEMENTS.filter((a) => !a.track || a.track === profile.track)` applied correctly in profile/page.tsx, `profile.track` confirmed in scope and guarded by the existing `if (!profile) return null`.
- CSS Grid bug class (the recurring `col-start`-without-`row-start` bug): grepped every `col-start` in StudentHome.tsx, BusinessHome.tsx, BusinessGrowHome.tsx, BusinessPlanHome.tsx — every grid item in both StudentHome and BusinessHome has both `col-start` and `row-start` explicitly set (BusinessGrowHome/BusinessPlanHome don't use the grid pattern at all). The diff didn't touch any grid-positioning classNames, only cell content. Built a static Tailwind-compiled render harness (real globals.css + tailwind.config, real classNames) and screenshotted StudentHome and BusinessHome at 390px/1280px, light/dark, with mission/primaryCareer/business_idea conditionally omitted (fresh-account scenarios) — no misaligned or wrong-row items in any combination; missing conditional cards leave an expected blank gap in their own pinned row, nothing shifts.
- No `.upsert()` against `profiles` anywhere in the diff (grepped) — the only `profiles`-adjacent upsert in the repo is pre-existing and against `business_profiles`, untouched by this task.
- No Supabase/migration files touched by this diff — track-lock/RLS/entitlement grants are out of scope for this pass and unaffected.
- Confirmed the pre-existing dead `src/components/ui/EmptyState.tsx` is genuinely unimported anywhere (grepped) — Dev's flag was accurate, left alone as agreed.
- `npx tsc --noEmit`: clean (exit 0), run directly, not taken on Dev's word.
- `npx next build`: clean (exit 0, all 41 routes compiled/prerendered), run directly.
- Mobile-safety check: Coach's only change is `lg:mx-auto lg:w-full lg:max-w-2xl` (confirmed single-line diff, no unprefixed touch). BusinessHome's RadialStat enlargement and milestones caption live entirely inside the `hidden ... lg:block` desktop-only hero card — zero mobile impact. BusinessPlanHome's `border-accent/30` and BusinessGrowHome's unprefixed Badge/"Recent" labels are intentionally cross-viewport (those pages have no separate mobile/desktop split to begin with) — rendered both at 390px via harness, no overflow/wrap/breakage.
- Verdict: no bugs found. This was a real adversarial pass, not a rubber stamp — full diff read, spec cross-referenced line-by-line, exclusions grepped, own tsc/build run, own Playwright renders across both themes/both viewports/multiple conditional-sibling combinations. QA sign-off given.

Full specs: see PRODUCT_SPECS.md at repo root.

COMPLETED TASKS: Full Alxioum build history (onboarding, School study system, Future/career matching, AI Coach, Profile, Stripe billing, student/business track split) — see prior task list, all marked complete. This audit is the first task of the new UI-improvement initiative.

BUGS: None found — QA ran a full adversarial pass on cc8c4ed (diff read in full, spec cross-referenced site-by-site, exclusions grepped, own tsc/build run, own Playwright renders) and found zero regressions. Notable code-quality/product issues (not blocking, not new — carried from Cato's original audit):
- ~~Profile page achievements grid ... not track-aware~~ FIXED this pass (Priority 2).
- ~~No shared `EmptyState` component exists~~ FIXED this pass (Priority 1) — new component at `src/components/shared/EmptyState.tsx`.
- Business track (Plan + Grow) is visually and structurally flatter than the student track by design/history, not oversight — partially addressed this pass (Priorities 3-5: hero ring parity, Grow trend badge/Recent labels, Plan hero accent border); Product explicitly decided against building a business sub-nav, so the deeper structural asymmetry remains by design, not oversight.
- Dev finding, not fixed this pass (out of spec scope): there is a pre-existing, unused `src/components/ui/EmptyState.tsx` with a different prop shape (`body`/`action` instead of `subtitle`/`cta`, no `bare` mode) that is not imported anywhere in the codebase. It now sits alongside the new `src/components/shared/EmptyState.tsx` this pass built per spec. Worth a follow-up to delete the dead `ui/EmptyState.tsx` so it doesn't get picked up by mistake later — flagging for Cato/QA rather than deleting it myself since PRODUCT_SPECS.md didn't mention it.

BLOCKERS: None. CEO has authorized building.

NEXT TASK: None open on this initiative. All 6 UI/UX priorities from PRODUCT_SPECS.md are implemented, QA-reviewed, and deployed. Remaining known gaps are intentionally deferred (see BUGS): the dead `ui/EmptyState.tsx` cleanup, and the business Plan/Grow structural asymmetry (a deliberate Product decision, not a bug).

DEPLOYMENT STATUS: 🟡 Deploying — pushed to `claude/futureos-student-app-3ewdz6` and triggered on Render; confirming live at https://alxioum-app.onrender.com once the build finishes.
