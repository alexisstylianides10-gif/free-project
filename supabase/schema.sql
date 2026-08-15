-- Alxioum database schema for Supabase (Postgres).
--
-- This file is a snapshot of the LIVE production schema (project "alxioum"),
-- regenerated from the database itself rather than hand-maintained, so it
-- won't drift out of sync again. It exists for onboarding/reference/IaC
-- purposes — the live project was actually built up via a sequence of
-- individual migrations applied through the Supabase MCP, not by running
-- this file top to bottom, but running this file against a fresh project
-- reproduces the same end state.
--
-- Every table is scoped to auth.uid() via Row Level Security, so each
-- signed-in user can only ever see or modify their own rows.

create extension if not exists "pgcrypto";
create extension if not exists "pg_cron" with schema extensions;
create extension if not exists "pg_net" with schema extensions;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default 'You',
  email text not null default '',
  timezone text not null default 'UTC',
  location text not null default '',
  avatar_initials text not null default 'U',
  plan text not null default 'Free' check (plan in ('Free', 'Student', 'Pro', 'Max')),
  proactivity text not null default 'balanced' check (proactivity in ('low', 'balanced', 'high')),
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  memory_enabled boolean not null default true,
  notification_prefs jsonb not null default '{"deadlines": true, "scheduleGaps": true, "dailyBriefing": true}',
  seeded boolean not null default false,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  ai_messages_used int not null default 0,
  ai_tokens_used int not null default 0,
  usage_period_start date not null default current_date,
  pro_interest_at timestamptz,
  credits_interest_at timestamptz,
  last_daily_briefing_sent_at date,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_subscription_status text,
  credits_balance int not null default 0
);

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  done boolean not null default false,
  due_date date,
  priority text not null default 'medium' check (priority in ('critical', 'high', 'medium', 'low')),
  estimated_minutes int,
  category text not null default 'personal',
  project text,
  goal_id uuid,
  recurring text not null default 'none' check (recurring in ('daily', 'weekly', 'none')),
  subtasks jsonb not null default '[]',
  ai_context text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  deadline_reminder_sent boolean not null default false
);

-- ---------------------------------------------------------------------------
-- events (calendar)
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  date date not null,
  start_time text not null,
  end_time text not null,
  type text not null default 'personal',
  location text,
  notes text,
  timezone text not null default 'UTC',
  recurrence text not null default 'none' check (recurrence in ('none', 'daily', 'weekly')),
  recurrence_until date,
  linked_task_id uuid,
  linked_goal_id uuid,
  ai_generated boolean not null default false,
  movable boolean not null default true,
  source text not null default 'alxioum' check (source in ('alxioum', 'google')),
  google_event_id text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- memory
-- ---------------------------------------------------------------------------
create table if not exists public.memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null,
  content text not null,
  reason text not null default '',
  source text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- conversations / messages (chat)
-- ---------------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Alxioum',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  tool_calls jsonb not null default '[]',
  pending_action jsonb,
  resolved_action jsonb,
  tokens_used int,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- pending_actions (AI-proposed writes awaiting user confirmation)
-- ---------------------------------------------------------------------------
create table if not exists public.pending_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete cascade,
  message_id uuid references public.messages (id) on delete cascade,
  tool text not null,
  action text not null check (action in ('create', 'update', 'delete', 'complete')),
  args jsonb not null default '{}',
  summary text not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'expired')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 minutes')
);

-- ---------------------------------------------------------------------------
-- agent_actions (activity log of executed tool calls)
-- ---------------------------------------------------------------------------
create table if not exists public.agent_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tool text not null,
  action text not null,
  status text not null check (status in ('success', 'failed')),
  metadata jsonb not null default '{}',
  event_id uuid,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- notifications (in-app notification feed)
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  body text not null default '',
  kind text not null default 'system',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- push_subscriptions (Web Push endpoints, one row per subscribed device)
-- ---------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- subjects / focus_sessions (Study section, Student plan)
-- ---------------------------------------------------------------------------
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text not null default 'violet',
  icon text not null default '📘',
  created_at timestamptz not null default now()
);

create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete set null,
  planned_minutes int not null,
  actual_minutes int not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- student_profiles (one row per Student-plan user)
-- ---------------------------------------------------------------------------
create table if not exists public.student_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  school_name text,
  country text,
  education_level text,
  term_start_date date,
  research_summary text,
  researched_at timestamptz,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- calendar_connections (Google Calendar OAuth tokens, one row per user)
-- ---------------------------------------------------------------------------
create table if not exists public.calendar_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  provider text not null default 'google' check (provider = 'google'),
  google_calendar_id text not null default 'primary',
  access_token text not null,
  refresh_token text not null,
  token_expires_at timestamptz not null,
  sync_token text,
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz
);

-- ---------------------------------------------------------------------------
-- waitlist (public marketing site sign-ups, pre-auth)
-- ---------------------------------------------------------------------------
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security: every table only visible/writable by its owner.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'profiles', 'tasks', 'events', 'memory', 'conversations', 'messages',
      'pending_actions', 'agent_actions', 'notifications', 'push_subscriptions',
      'subjects', 'focus_sessions', 'student_profiles', 'calendar_connections', 'waitlist'
    ])
  loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;

-- profiles: id IS the user id
drop policy if exists "profiles_owner" on public.profiles;
create policy "profiles_owner" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- calendar_connections / student_profiles: primary key IS user_id
drop policy if exists "calendar_connections_owner" on public.calendar_connections;
create policy "calendar_connections_owner" on public.calendar_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "student_profiles_select_own" on public.student_profiles;
create policy "student_profiles_select_own" on public.student_profiles
  for select using (auth.uid() = user_id);
drop policy if exists "student_profiles_insert_own" on public.student_profiles;
create policy "student_profiles_insert_own" on public.student_profiles
  for insert with check (auth.uid() = user_id);
drop policy if exists "student_profiles_update_own" on public.student_profiles;
create policy "student_profiles_update_own" on public.student_profiles
  for update using (auth.uid() = user_id);
drop policy if exists "student_profiles_delete_own" on public.student_profiles;
create policy "student_profiles_delete_own" on public.student_profiles
  for delete using (auth.uid() = user_id);

-- subjects / focus_sessions: per-action policies (select/insert/update/delete)
do $$
declare
  t text;
begin
  for t in select unnest(array['subjects', 'focus_sessions'])
  loop
    execute format('drop policy if exists "%s_select_own" on public.%I;', t, t);
    execute format('create policy "%s_select_own" on public.%I for select using (auth.uid() = user_id);', t, t);
    execute format('drop policy if exists "%s_insert_own" on public.%I;', t, t);
    execute format('create policy "%s_insert_own" on public.%I for insert with check (auth.uid() = user_id);', t, t);
    execute format('drop policy if exists "%s_update_own" on public.%I;', t, t);
    execute format('create policy "%s_update_own" on public.%I for update using (auth.uid() = user_id);', t, t);
    execute format('drop policy if exists "%s_delete_own" on public.%I;', t, t);
    execute format('create policy "%s_delete_own" on public.%I for delete using (auth.uid() = user_id);', t, t);
  end loop;
end $$;

-- push_subscriptions: per-action policies, authenticated role only
do $$
begin
  execute 'drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;';
  execute 'create policy "push_subscriptions_select_own" on public.push_subscriptions for select to authenticated using (user_id = auth.uid());';
  execute 'drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;';
  execute 'create policy "push_subscriptions_insert_own" on public.push_subscriptions for insert to authenticated with check (user_id = auth.uid());';
  execute 'drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;';
  execute 'create policy "push_subscriptions_delete_own" on public.push_subscriptions for delete to authenticated using (user_id = auth.uid());';
end $$;

-- everything else: standard "for all" user_id ownership, authenticated role
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'tasks', 'events', 'memory', 'conversations', 'messages',
      'pending_actions', 'agent_actions', 'notifications'
    ])
  loop
    execute format('drop policy if exists "%s_owner" on public.%I;', t, t);
    execute format(
      'create policy "%s_owner" on public.%I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);',
      t, t
    );
  end loop;
end $$;

-- waitlist: anyone (signed in or not) can add themselves, nobody can read others'
drop policy if exists "waitlist_public_insert" on public.waitlist;
create policy "waitlist_public_insert" on public.waitlist
  for insert to anon, authenticated with check (true);

-- ---------------------------------------------------------------------------
-- Auto-create a profile row whenever a new auth user signs up.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, avatar_initials)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(new.email, ''),
    upper(left(coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)), 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Automatic notifications: a private, RLS-free secrets table + RPC (so the
-- send-notifications Edge Function — see supabase/functions/send-notifications
-- — can read the VAPID keys without them ever being readable from the client),
-- plus a pg_cron job that invokes the function every 15 minutes. The function
-- itself checks each user's local time/timezone and notification_prefs
-- before sending anything, so a 15-minute tick doesn't mean 15-minute spam.
-- ---------------------------------------------------------------------------
create schema if not exists private;

create table if not exists private.app_secrets (
  key text primary key,
  value text not null
);
-- No RLS policy is added on purpose: this table has RLS enabled with zero
-- policies, so it's unreadable by anon/authenticated roles entirely. Only
-- security-definer functions (like get_app_secrets below) and the service
-- role can read it.
alter table private.app_secrets enable row level security;

-- Populate with your own values after running this file:
--   insert into private.app_secrets (key, value) values
--     ('vapid_public_key', '...'),
--     ('vapid_private_key', '...'),
--     ('vapid_subject', 'mailto:support@alxioum.app')
--   on conflict (key) do update set value = excluded.value;

create or replace function public.get_app_secrets()
returns table (key text, value text)
language sql
security definer set search_path = public, private
as $$
  select key, value from private.app_secrets;
$$;

-- Restrict get_app_secrets to the service role only (the Edge Function uses
-- the service-role key) — never grant this to anon/authenticated.
revoke all on function public.get_app_secrets() from public, anon, authenticated;
grant execute on function public.get_app_secrets() to service_role;

select cron.schedule(
  'send-notifications-every-15-min',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-notifications',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.anon_key', true), 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);
-- Note: the live cron job has the project URL and anon key hardcoded into
-- the command text (Postgres GUCs like app.settings.* aren't reliably
-- available inside pg_cron's execution context) — check `select command from
-- cron.job;` on the live project for the exact working command if you need
-- to recreate this by hand instead of running this file fresh.
