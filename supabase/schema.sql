-- FutureOS database schema for Supabase (Postgres).
--
-- Every table is scoped to auth.uid() via Row Level Security, so each
-- signed-in student can only ever see or modify their own rows. Reference
-- content (careers, missions, achievements, skills, roadmap levels) lives
-- in TypeScript catalogs (src/lib/catalog/*), not in the database — it's
-- static product content, not per-user data.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default 'Student',
  year_group text not null default '',
  country text not null default '',
  avatar_emoji text not null default '🚀',
  xp_school int not null default 0,
  xp_career int not null default 0,
  xp_skill int not null default 0,
  xp_project int not null default 0,
  streak_count int not null default 0,
  longest_streak int not null default 0,
  last_active_date date,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- onboarding_responses
-- ---------------------------------------------------------------------------
create table if not exists public.onboarding_responses (
  user_id uuid primary key references auth.users (id) on delete cascade,
  year_group text not null default '',
  country text not null default '',
  subjects text[] not null default '{}',
  interests text[] not null default '{}',
  strengths text[] not null default '{}',
  explore_goals text[] not null default '{}',
  free_time text not null default '',
  biggest_goal text not null default '',
  biggest_problem text not null default '',
  top_matches jsonb not null default '[]',
  created_at timestamptz not null default now()
);

alter table public.onboarding_responses enable row level security;

create policy "onboarding_select_own" on public.onboarding_responses for select to authenticated using (user_id = auth.uid());
create policy "onboarding_upsert_own" on public.onboarding_responses for insert to authenticated with check (user_id = auth.uid());
create policy "onboarding_update_own" on public.onboarding_responses for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- homework
-- ---------------------------------------------------------------------------
create table if not exists public.homework (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject text not null,
  title text not null,
  due_date date not null,
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  status text not null default 'pending' check (status in ('pending', 'completed')),
  created_at timestamptz not null default now()
);

alter table public.homework enable row level security;
create policy "homework_all_own" on public.homework for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- exams
-- ---------------------------------------------------------------------------
create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject text not null,
  title text not null,
  exam_date date not null,
  created_at timestamptz not null default now()
);

alter table public.exams enable row level security;
create policy "exams_all_own" on public.exams for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- timetable_entries
-- ---------------------------------------------------------------------------
create table if not exists public.timetable_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  subject text not null,
  room text
);

alter table public.timetable_entries enable row level security;
create policy "timetable_all_own" on public.timetable_entries for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- study_sessions (AI-generated weekly study plan)
-- ---------------------------------------------------------------------------
create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  day_of_week int not null check (day_of_week between 0 and 6),
  subject text not null,
  duration_min int not null default 30,
  completed boolean not null default false
);

alter table public.study_sessions enable row level security;
create policy "study_sessions_all_own" on public.study_sessions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- career_paths (careers the student has added from the catalog)
-- ---------------------------------------------------------------------------
create table if not exists public.career_paths (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  career_slug text not null,
  match_percent int not null default 0,
  is_primary boolean not null default false,
  added_at timestamptz not null default now(),
  unique (user_id, career_slug)
);

alter table public.career_paths enable row level security;
create policy "career_paths_all_own" on public.career_paths for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- roadmap_progress
-- ---------------------------------------------------------------------------
create table if not exists public.roadmap_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  level_number int not null,
  unlocked boolean not null default false,
  completed_at timestamptz,
  primary key (user_id, level_number)
);

alter table public.roadmap_progress enable row level security;
create policy "roadmap_progress_all_own" on public.roadmap_progress for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- user_missions
-- ---------------------------------------------------------------------------
create table if not exists public.user_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mission_id text not null,
  status text not null default 'active' check (status in ('active', 'completed')),
  xp_awarded int not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, mission_id)
);

alter table public.user_missions enable row level security;
create policy "user_missions_all_own" on public.user_missions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- user_skills
-- ---------------------------------------------------------------------------
create table if not exists public.user_skills (
  user_id uuid not null references auth.users (id) on delete cascade,
  skill_key text not null,
  proficiency int not null default 0 check (proficiency between 0 and 100),
  updated_at timestamptz not null default now(),
  primary key (user_id, skill_key)
);

alter table public.user_skills enable row level security;
create policy "user_skills_all_own" on public.user_skills for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- user_achievements
-- ---------------------------------------------------------------------------
create table if not exists public.user_achievements (
  user_id uuid not null references auth.users (id) on delete cascade,
  achievement_key text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, achievement_key)
);

alter table public.user_achievements enable row level security;
create policy "user_achievements_all_own" on public.user_achievements for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- chat_messages (AI Coach history)
-- ---------------------------------------------------------------------------
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;
create policy "chat_messages_all_own" on public.chat_messages for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- weekly_reviews
-- ---------------------------------------------------------------------------
create table if not exists public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  assignments_completed int not null default 0,
  study_minutes int not null default 0,
  missions_completed int not null default 0,
  consistency_days int not null default 0,
  skill_deltas jsonb not null default '{}',
  next_focus text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

alter table public.weekly_reviews enable row level security;
create policy "weekly_reviews_all_own" on public.weekly_reviews for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- indexes
-- ---------------------------------------------------------------------------
create index if not exists homework_user_due_idx on public.homework (user_id, due_date);
create index if not exists exams_user_date_idx on public.exams (user_id, exam_date);
create index if not exists timetable_user_day_idx on public.timetable_entries (user_id, day_of_week);
create index if not exists study_sessions_user_week_idx on public.study_sessions (user_id, week_start);
create index if not exists chat_messages_user_created_idx on public.chat_messages (user_id, created_at);
