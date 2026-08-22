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
  -- Which product track this account is on — set once at /choose-plan,
  -- before onboarding. Ordinary client-writable preference, not an
  -- entitlement flag, so it's fine in the client's UPDATE grant below.
  track text not null default 'student' check (track in ('student', 'business')),
  billing_interval text check (billing_interval in ('monthly', 'yearly')),
  -- Alxioum Plus billing (see "billing" section below for the column-grant lockdown).
  plan text not null default 'free' check (plan in ('free', 'plus')),
  plan_status text not null default 'trialing' check (plan_status in ('trialing', 'active', 'canceled', 'past_due')),
  trial_ends_at timestamptz not null default (now() + interval '3 days'),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Billing columns (plan, plan_status, trial_ends_at, stripe_customer_id,
-- stripe_subscription_id) are deliberately excluded from the client's
-- UPDATE grant below — the update-own RLS policy above only checks row
-- ownership, not which columns are being written, so without this a signed
-- in user could grant themselves Alxioum Plus by calling
-- `supabase.from("profiles").update({ plan: "plus" })` directly. Every
-- billing-column write in the app goes through supabaseServiceRole()
-- instead (billing API routes + the Stripe webhook), which bypasses this
-- grant entirely.
revoke update on public.profiles from authenticated;
grant update (
  full_name, year_group, country, avatar_emoji, xp_school, xp_career,
  xp_skill, xp_project, streak_count, longest_streak, last_active_date,
  onboarding_completed, track, billing_interval
) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- onboarding_responses
-- ---------------------------------------------------------------------------
create table if not exists public.onboarding_responses (
  user_id uuid primary key references auth.users (id) on delete cascade,
  year_group text not null default '',
  country text not null default '',
  school_name text not null default '',
  curriculum_summary text,
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
-- chat_threads + chat_messages (AI Coach history, one row per named
-- conversation — a thread's title is auto-generated from its first
-- exchange, see /api/coach)
-- ---------------------------------------------------------------------------
create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

alter table public.chat_threads enable row level security;
create policy "chat_threads_all_own" on public.chat_threads for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
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
create index if not exists chat_threads_user_idx on public.chat_threads (user_id, last_message_at);
create index if not exists chat_messages_thread_idx on public.chat_messages (thread_id, created_at);

-- ---------------------------------------------------------------------------
-- Study system: subjects, materials, topics, plans, sessions, quizzes,
-- flashcards, and tutor chat. Every table user_id-scoped with RLS.
-- ---------------------------------------------------------------------------

create table if not exists public.study_subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  icon text not null default '📘',
  created_at timestamptz not null default now()
);

alter table public.study_subjects enable row level security;
create policy "study_subjects_all_own" on public.study_subjects for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.study_materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null references public.study_subjects (id) on delete cascade,
  title text not null,
  kind text not null check (kind in ('pdf', 'image', 'notes', 'paste')),
  storage_path text,
  raw_text text,
  status text not null default 'pending' check (status in ('pending', 'analyzing', 'analyzed', 'failed')),
  analysis jsonb,
  created_at timestamptz not null default now()
);

alter table public.study_materials enable row level security;
create policy "study_materials_all_own" on public.study_materials for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.study_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null references public.study_subjects (id) on delete cascade,
  material_id uuid references public.study_materials (id) on delete set null,
  name text not null,
  summary text,
  key_concepts text[] not null default '{}',
  mastery int not null default 30 check (mastery between 0 and 100),
  quiz_attempts int not null default 0,
  correct_answers int not null default 0,
  last_practiced_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.study_topics enable row level security;
create policy "study_topics_all_own" on public.study_topics for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.exams add column if not exists study_subject_id uuid references public.study_subjects (id) on delete set null;

create table if not exists public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null references public.study_subjects (id) on delete cascade,
  exam_id uuid references public.exams (id) on delete set null,
  accepted boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.study_plans enable row level security;
create policy "study_plans_all_own" on public.study_plans for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.study_plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.study_plans (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  day_index int not null,
  topic_id uuid references public.study_topics (id) on delete set null,
  label text not null,
  duration_min int not null default 30,
  completed boolean not null default false
);

alter table public.study_plan_items enable row level security;
create policy "study_plan_items_all_own" on public.study_plan_items for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.study_focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null references public.study_subjects (id) on delete cascade,
  topic_id uuid references public.study_topics (id) on delete set null,
  mode text not null check (mode in ('learn', 'practice', 'quiz', 'review')),
  duration_min int not null default 0,
  accuracy_percent int,
  created_at timestamptz not null default now()
);

alter table public.study_focus_sessions enable row level security;
create policy "study_focus_sessions_all_own" on public.study_focus_sessions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.study_quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null references public.study_subjects (id) on delete cascade,
  topic_id uuid references public.study_topics (id) on delete set null,
  material_id uuid references public.study_materials (id) on delete set null,
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard', 'exam')),
  question_count int not null,
  questions jsonb not null,
  is_mock_exam boolean not null default false,
  time_limit_min int,
  created_at timestamptz not null default now()
);

alter table public.study_quizzes enable row level security;
create policy "study_quizzes_all_own" on public.study_quizzes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.study_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.study_quizzes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  score_percent int not null,
  correct_count int not null,
  results jsonb not null,
  strong_topics text[] not null default '{}',
  weak_topics text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.study_quiz_attempts enable row level security;
create policy "study_quiz_attempts_all_own" on public.study_quiz_attempts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.study_flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null references public.study_subjects (id) on delete cascade,
  topic_id uuid references public.study_topics (id) on delete set null,
  front text not null,
  back text not null,
  interval_days int not null default 1,
  ease_factor numeric not null default 2.5,
  due_date date not null default current_date,
  reps int not null default 0,
  last_result text check (last_result in ('knew', 'almost', 'didnt')),
  created_at timestamptz not null default now()
);

alter table public.study_flashcards enable row level security;
create policy "study_flashcards_all_own" on public.study_flashcards for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.study_tutor_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null references public.study_subjects (id) on delete cascade,
  topic_id uuid references public.study_topics (id) on delete set null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.study_tutor_messages enable row level security;
create policy "study_tutor_messages_all_own" on public.study_tutor_messages for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists study_materials_subject_idx on public.study_materials (user_id, subject_id);
create index if not exists study_topics_subject_idx on public.study_topics (user_id, subject_id);
create index if not exists study_plan_items_plan_idx on public.study_plan_items (plan_id, day_index);
create index if not exists study_focus_sessions_user_idx on public.study_focus_sessions (user_id, created_at);
create index if not exists study_quizzes_subject_idx on public.study_quizzes (user_id, subject_id);
create index if not exists study_quiz_attempts_quiz_idx on public.study_quiz_attempts (quiz_id, created_at);
create index if not exists study_flashcards_due_idx on public.study_flashcards (user_id, due_date);
create index if not exists study_tutor_messages_topic_idx on public.study_tutor_messages (user_id, subject_id, created_at);

-- Private storage bucket for uploaded study material (PDFs/photos).
insert into storage.buckets (id, name, public)
values ('study-materials', 'study-materials', false)
on conflict (id) do nothing;

create policy "study_materials_storage_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'study-materials' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "study_materials_storage_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'study-materials' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "study_materials_storage_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'study-materials' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- Business track: plan basics, milestones, self-logged metrics, an AI
-- marketing/content helper, and competitor notes. Same per-user RLS pattern
-- as everything above; `business_` prefix mirrors the `study_` convention.
-- ---------------------------------------------------------------------------

create table if not exists public.business_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  business_idea text not null default '',
  stage text not null default 'idea' check (stage in ('idea', 'validating', 'building', 'launched')),
  target_customer text not null default '',
  ai_snapshot text,
  created_at timestamptz not null default now()
);

alter table public.business_profiles enable row level security;
create policy "business_profiles_all_own" on public.business_profiles for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.business_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  due_date date,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.business_milestones enable row level security;
create policy "business_milestones_all_own" on public.business_milestones for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.business_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  metric_key text not null,
  value numeric not null,
  logged_date date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.business_metrics enable row level security;
create policy "business_metrics_all_own" on public.business_metrics for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.business_content_ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null,
  topic text not null,
  generated_content text,
  status text not null default 'draft' check (status in ('draft', 'used')),
  created_at timestamptz not null default now()
);

alter table public.business_content_ideas enable row level security;
create policy "business_content_ideas_all_own" on public.business_content_ideas for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.business_competitors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  url text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.business_competitors enable row level security;
create policy "business_competitors_all_own" on public.business_competitors for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists business_milestones_user_idx on public.business_milestones (user_id, order_index);
create index if not exists business_metrics_user_date_idx on public.business_metrics (user_id, logged_date);
create index if not exists business_content_ideas_user_idx on public.business_content_ideas (user_id, created_at);
create index if not exists business_competitors_user_idx on public.business_competitors (user_id, created_at);
