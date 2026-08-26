# PROJECT STATE

PROJECT: Alxioum (formerly FutureOS) — student/founder productivity app. Live production app, not greenfield.

GOAL: UI/UX improvement initiative on the existing live app. CEO brief: "Use the team to make Alxioum better, use Product to make the UI a lot better — fix it." Building is authorized now, not just planning. Scope: visual polish, consistency, and UX gaps in the existing screens — not new features, not a redesign of the architecture.

MVP: N/A — post-MVP, live app with paying users on two locked tracks (student, business).

FEATURES: Student track: Home, School (Subjects/Exams/Flashcards/Quizzes/Progress study system), Future (career matches + roadmap), Coach (AI chat), Profile (XP/achievements/skills). Business track: Home, Plan (milestones), Grow (metrics/expenses/content helper/competitors), Coach, Profile. Shared: onboarding + /choose-plan (track lock), Stripe billing + PaywallGate, missions, weekly review.

TECH STACK: Next.js 15 (App Router) + TypeScript + Tailwind. Supabase (Postgres + Auth). Stripe. Anthropic Claude API. Hosted on Render (https://alxioum-app.onrender.com). Design tokens via CSS custom properties in globals.css (dark-first, `.light` override class), gradient/glass utility classes, RadialStat/StatTile/Card/Badge/ProgressBar as the shared visual primitives.

ARCHITECTURE: Two product tracks (student, business) chosen once at /choose-plan and permanently locked by a Postgres trigger once onboarding_completed is true. Route-level branching pattern: shared routes (`/app`, `/app/school`, `/app/future`) render a track-specific component (e.g. `StudentHome`/`BusinessHome`, `StudentSchoolHome`/`BusinessPlanHome`, `StudentFutureHome`/`BusinessGrowHome`) chosen by `profile.track` in a thin page/layout wrapper. Coach and Profile are track-agnostic single implementations with inline conditional copy. Nav (SidebarNav desktop, BottomNav mobile) is driven by one shared `STUDENT_TABS`/`BUSINESS_TABS` table in `src/lib/navTabs.ts`. The student School tab has a real sub-app (SchoolSubNav: Home/Subjects/Exams/Flashcards/Quizzes/Progress); the business Plan tab is intentionally a single flat page with no sub-nav (by design, per code comment in `school/layout.tsx`) — this is the root cause of most business-track UI thinness identified below.

CURRENT TASK: 🔵 IN PROGRESS — Cato (CTO) completed codebase audit of Home/School/Future/Coach/Profile for both tracks + shared components/design tokens. Handoff brief to Product written below. Awaiting Product's UI/UX specs for the priorities listed.

COMPLETED TASKS: Full Alxioum build history (onboarding, School study system, Future/career matching, AI Coach, Profile, Stripe billing, student/business track split) — see prior task list, all marked complete. This audit is the first task of the new UI-improvement initiative.

BUGS: None found that break functionality during this pass (this was a UI/UX audit, not a full QA sweep — see handoff note for QA). Notable code-quality/product issues (not blocking, but real):
- Profile page achievements grid (`src/app/app/profile/page.tsx` + `src/lib/catalog/achievements.ts`) is not track-aware: 5 of 9 achievements ("First Study Session," "10 Study Sessions," "First Quiz," "First Mock Exam," "Flashcard Master") are Study-system-only and can never unlock for business-track users, who will always see them locked/grayed with irrelevant copy.
- No shared `EmptyState` component exists. 27 occurrences of ad-hoc "nothing yet" copy across 20 files, styled inconsistently (most are plain centered muted text in a Card with no icon or CTA; a few, like StudentFutureHome's no-matches state, do have an icon+CTA). This is the single highest-leverage, lowest-risk UI fix available.
- Business track (Plan + Grow) is visually and structurally flatter than the student track by design/history, not oversight: no radial-stat hero treatment, no sub-nav, four dense stacked raw-input forms on one Grow page. Worth deliberately deciding whether to invest here or accept the asymmetry.

BLOCKERS: None. CEO has authorized building.

NEXT TASK: 🟡 TODO — Product specifies the 6 priorities below in detail (copy, layout, states); Dev implements; QA reviews for regressions across both tracks and both themes (light/dark) before merge.

DEPLOYMENT STATUS: 🟢 Live at https://alxioum-app.onrender.com, unaffected by this audit (no code changed yet).
