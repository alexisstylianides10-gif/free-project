# PROJECT STATE

PROJECT: Alxioum (formerly FutureOS) — student/founder productivity app. Live production app, not greenfield.

GOAL: UI/UX improvement initiative on the existing live app. CEO brief: "Use the team to make Alxioum better, use Product to make the UI a lot better — fix it." Building is authorized now, not just planning. Scope: visual polish, consistency, and UX gaps in the existing screens — not new features, not a redesign of the architecture.

MVP: N/A — post-MVP, live app with paying users on two locked tracks (student, business).

FEATURES: Student track: Home, School (Subjects/Exams/Flashcards/Quizzes/Progress study system), Future (career matches + roadmap), Coach (AI chat), Profile (XP/achievements/skills). Business track: Home, Plan (milestones), Grow (metrics/expenses/content helper/competitors), Coach, Profile. Shared: onboarding + /choose-plan (track lock), Stripe billing + PaywallGate, missions, weekly review.

TECH STACK: Next.js 15 (App Router) + TypeScript + Tailwind. Supabase (Postgres + Auth). Stripe. Anthropic Claude API. Hosted on Render (https://alxioum-app.onrender.com). Design tokens via CSS custom properties in globals.css (dark-first, `.light` override class), gradient/glass utility classes, RadialStat/StatTile/Card/Badge/ProgressBar as the shared visual primitives.

ARCHITECTURE: Two product tracks (student, business) chosen once at /choose-plan and permanently locked by a Postgres trigger once onboarding_completed is true. Route-level branching pattern: shared routes (`/app`, `/app/school`, `/app/future`) render a track-specific component (e.g. `StudentHome`/`BusinessHome`, `StudentSchoolHome`/`BusinessPlanHome`, `StudentFutureHome`/`BusinessGrowHome`) chosen by `profile.track` in a thin page/layout wrapper. Coach and Profile are track-agnostic single implementations with inline conditional copy. Nav (SidebarNav desktop, BottomNav mobile) is driven by one shared `STUDENT_TABS`/`BUSINESS_TABS` table in `src/lib/navTabs.ts`. The student School tab has a real sub-app (SchoolSubNav: Home/Subjects/Exams/Flashcards/Quizzes/Progress); the business Plan tab is intentionally a single flat page with no sub-nav (by design, per code comment in `school/layout.tsx`) — this is the root cause of most business-track UI thinness identified below.

CURRENT TASK: 🟢 DONE — Dev implemented all 6 PRODUCT_SPECS.md priorities: (1) shared `src/components/shared/EmptyState.tsx` built and adopted at all 19-20 listed call sites across StudentHome, BusinessHome, BusinessGrowHome, BusinessPlanHome, StudentFutureHome, school/exams, school/quizzes (2 states), school/quizzes/exam-mode, school/flashcards, school/subjects/[subjectId], StudentSchoolHome (3 states), school/progress, profile, weekly-review — the 5 explicitly-excluded sites (StudentHome mini stat tiles, coach thread popover, CountrySelect, quiz results stat line, weak-topics inline text) were left untouched and verified via grep; (2) track-aware Achievements — `track?: "student"` added to `AchievementDef`, tagged on the 5 study-only entries, profile page filters by `profile.track`; (3) BusinessHome hero ring enlarged to size=128/strokeWidth=10 with a "X of Y milestones done" caption; (4) BusinessGrowHome got a metrics trend Badge and "Recent" labels above the Metrics/Expenses/Competitors history lists; (5) BusinessPlanHome hero Card got `border-accent/30` only — no sub-nav built, per Product's explicit cut; (6) Coach outer container got `lg:mx-auto lg:w-full lg:max-w-2xl`. `npx tsc --noEmit` and `npx next build` both clean. Full specs: see PRODUCT_SPECS.md at repo root.

COMPLETED TASKS: Full Alxioum build history (onboarding, School study system, Future/career matching, AI Coach, Profile, Stripe billing, student/business track split) — see prior task list, all marked complete. This audit is the first task of the new UI-improvement initiative.

BUGS: None found that break functionality during this pass (this was a UI/UX audit, not a full QA sweep — see handoff note for QA). Notable code-quality/product issues (not blocking, but real):
- ~~Profile page achievements grid ... not track-aware~~ FIXED this pass (Priority 2).
- ~~No shared `EmptyState` component exists~~ FIXED this pass (Priority 1) — new component at `src/components/shared/EmptyState.tsx`.
- Business track (Plan + Grow) is visually and structurally flatter than the student track by design/history, not oversight — partially addressed this pass (Priorities 3-5: hero ring parity, Grow trend badge/Recent labels, Plan hero accent border); Product explicitly decided against building a business sub-nav, so the deeper structural asymmetry remains by design, not oversight.
- Dev finding, not fixed this pass (out of spec scope): there is a pre-existing, unused `src/components/ui/EmptyState.tsx` with a different prop shape (`body`/`action` instead of `subtitle`/`cta`, no `bare` mode) that is not imported anywhere in the codebase. It now sits alongside the new `src/components/shared/EmptyState.tsx` this pass built per spec. Worth a follow-up to delete the dead `ui/EmptyState.tsx` so it doesn't get picked up by mistake later — flagging for Cato/QA rather than deleting it myself since PRODUCT_SPECS.md didn't mention it.

BLOCKERS: None. CEO has authorized building.

NEXT TASK: 🟡 TODO — QA reviews Dev's implementation for regressions across both tracks and both themes (light/dark) before merge.

DEPLOYMENT STATUS: 🟢 Live at https://alxioum-app.onrender.com, unaffected by this audit (no code changed yet).
