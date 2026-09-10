# FutureOS

An AI-powered student platform: **School → Skills → Projects → Career.**
FutureOS helps students (roughly ages 13–18) stay on top of school while
using their free time to discover and build their future career — it never
trades one for the other.

"FutureOS" is a placeholder name. Rebranding is one file: `src/lib/branding.ts`.

## Stack

- **Next.js 15** (App Router, TypeScript, Tailwind) — mobile-first PWA
- **Supabase** — Postgres + Auth + Row Level Security (every table is scoped to `auth.uid()`)
- **Claude (Anthropic API)** — the Future Coach chat, `claude-opus-5` by default
- **Vercel** — deployment target (see below)

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

Required env vars (`.env.local`):

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page — the anon/publishable key (safe for the browser; access is controlled by RLS, not secrecy) |
| `ANTHROPIC_API_KEY` | console.anthropic.com — server-side only, powers `/api/coach` |

The database schema lives in `supabase/schema.sql` and has already been applied to
the project this branch was built against. To stand up a fresh Supabase
project instead, create one and run that file's contents once (SQL editor,
or `supabase db push` if you prefer the CLI) — it's idempotent (`create
table if not exists`).

## Deploying to Vercel

1. Push this repo to GitHub (already done if you're reading this on the `claude/futureos-student-app-3ewdz6` branch).
2. In Vercel: **New Project** → import the repo → framework preset **Next.js** (auto-detected).
3. Add the three env vars above under Project Settings → Environment Variables.
4. Deploy. No build config changes needed.

## Architecture notes

- **Reference content is static, not database-backed.** Careers, missions,
  achievements, skills, and the career roadmap live as TypeScript catalogs
  under `src/lib/catalog/` — they're product content, not per-user data.
  Everything about a specific *student* (profile, homework, exams,
  timetable, study plan, chosen careers, XP, earned achievements, chat
  history, weekly reviews) is a real Supabase table under RLS.
- **Auth is client-side Supabase** (`persistSession` in the browser),
  guarded by `src/app/app/layout.tsx` rather than middleware — see
  `src/components/providers/AuthProvider.tsx`.
- **Onboarding happens before account creation.** The 9-question flow
  (`src/app/onboarding`) runs entirely in memory and computes a career-match
  "Future Map" client-side (`src/lib/matching.ts`) with zero backend calls.
  Answers are only persisted — profile, matches, a realistic seeded
  timetable/homework/exam set (`src/lib/seed/demoData.ts`), starter skills,
  and the first roadmap level — once the student creates an account
  (`src/lib/onboarding/completeOnboarding.ts`). If Supabase requires email
  confirmation, the answers wait in `localStorage` and get applied on first
  login instead of being lost.
- **XP, streaks, and achievements go through one place**:
  `src/lib/actions/xp.ts` and `src/lib/actions/achievements.ts`. Every
  screen that awards XP (homework, study sessions, missions) calls these
  instead of hand-rolling profile updates, so streak math and "first time"
  achievement checks can't drift between screens.
- **The AI Coach always puts school first.** `src/lib/coach/systemPrompt.ts`
  builds a system prompt from the student's real pending homework and
  upcoming exams and hard-codes the priority rule and the app's safety
  constraints (no encouraging skipping school, no unsafe stranger contact,
  no financial promises, age-restriction notices on external platforms).

## Future integration points

The schema and architecture are set up so these can be added without a
rewrite: Google Calendar / school calendar sync, parent accounts, school
accounts, and swapping the static catalogs for admin-editable tables if
FutureOS ever needs to update career/mission content without a deploy.
