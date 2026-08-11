-- Alxioum database schema for Supabase (Postgres).
-- Run this once in your Supabase project's SQL Editor (Dashboard -> SQL Editor -> New query -> paste -> Run).
-- Every table is scoped to auth.uid() via Row Level Security, so each signed-in
-- user can only ever see or modify their own rows.

create extension if not exists "pgcrypto";

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
  plan text not null default 'Free' check (plan in ('Free', 'Pro', 'Ultra')),
  proactivity text not null default 'balanced' check (proactivity in ('low', 'balanced', 'high')),
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  memory_enabled boolean not null default true,
  notification_prefs jsonb not null default '{"deadlines":true,"financeAlerts":true,"scheduleGaps":true,"goalNudges":true}',
  seeded boolean not null default false,
  created_at timestamptz not null default now()
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
  completed_at timestamptz
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
  linked_task_id uuid,
  linked_goal_id uuid,
  ai_generated boolean not null default false,
  movable boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- goals
-- ---------------------------------------------------------------------------
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  why text not null default '',
  progress int not null default 0 check (progress between 0 and 100),
  deadline date,
  category text not null default 'personal',
  milestones jsonb not null default '[]',
  linked_task_ids jsonb not null default '[]',
  linked_habit_ids jsonb not null default '[]',
  ai_plan text not null default '',
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- habits
-- ---------------------------------------------------------------------------
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  emoji text not null default '✅',
  target_per_week int not null default 7,
  history jsonb not null default '{}',
  best_streak int not null default 0,
  ai_note text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- transactions
-- ---------------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  merchant text not null,
  amount numeric not null,
  date date not null,
  category text not null default 'Other',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- subscriptions
-- ---------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  amount numeric not null,
  renews_on date not null,
  category text not null default 'Subscriptions'
);

-- ---------------------------------------------------------------------------
-- budgets (one row per category per user)
-- ---------------------------------------------------------------------------
create table if not exists public.budgets (
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null,
  limit_amount numeric not null,
  primary key (user_id, category)
);

-- ---------------------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------------------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  kind text not null default 'text',
  folder text not null default 'Uploads',
  tags jsonb not null default '[]',
  size_kb int not null default 0,
  uploaded_at date not null default current_date,
  ai_summary text,
  extracted_dates jsonb not null default '[]'
);

-- ---------------------------------------------------------------------------
-- lists
-- ---------------------------------------------------------------------------
create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  emoji text not null default '📋',
  kind text not null default 'custom',
  items jsonb not null default '[]'
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
-- user_agents (per-user install/active state + run history for the fixed
-- agent catalog that ships in the app itself)
-- ---------------------------------------------------------------------------
create table if not exists public.user_agents (
  user_id uuid not null references auth.users (id) on delete cascade,
  agent_id text not null,
  installed boolean not null default false,
  active boolean not null default false,
  run_history jsonb not null default '[]',
  primary key (user_id, agent_id)
);

-- ---------------------------------------------------------------------------
-- notifications
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
-- chat_messages
-- ---------------------------------------------------------------------------
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'ai')),
  content text not null,
  actions jsonb not null default '[]',
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
      'profiles', 'tasks', 'events', 'goals', 'habits', 'transactions',
      'subscriptions', 'budgets', 'documents', 'lists', 'memory',
      'user_agents', 'notifications', 'chat_messages'
    ])
  loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;

-- profiles: id IS the user id
drop policy if exists "profiles_owner" on public.profiles;
create policy "profiles_owner" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- budgets / user_agents: composite key includes user_id directly
drop policy if exists "budgets_owner" on public.budgets;
create policy "budgets_owner" on public.budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_agents_owner" on public.user_agents;
create policy "user_agents_owner" on public.user_agents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- everything else: standard user_id ownership
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'tasks', 'events', 'goals', 'habits', 'transactions',
      'subscriptions', 'documents', 'lists', 'memory',
      'notifications', 'chat_messages'
    ])
  loop
    execute format('drop policy if exists "%s_owner" on public.%I;', t, t);
    execute format(
      'create policy "%s_owner" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id);',
      t, t
    );
  end loop;
end $$;

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

-- Trigger execution doesn't check EXECUTE privileges, so this is safe to
-- revoke — it just stops the function from being directly callable as a
-- PostgREST RPC endpoint (`SECURITY DEFINER` functions are auto-exposed
-- otherwise).
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- waitlist
-- Public landing-page signups. Anyone (including anonymous visitors) may
-- insert their email; nobody can read, update, or delete rows from the
-- client — that's restricted to the Supabase dashboard / service role.
-- ---------------------------------------------------------------------------
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

drop policy if exists "waitlist_public_insert" on public.waitlist;
create policy "waitlist_public_insert" on public.waitlist
  for insert
  to anon, authenticated
  with check (true);

-- ---------------------------------------------------------------------------
-- calendar_events: the V1 Calendar Agent's data store.
-- ---------------------------------------------------------------------------
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_events_time_order check (end_time > start_time)
);

create index if not exists calendar_events_user_start_idx on public.calendar_events (user_id, start_time);

alter table public.calendar_events enable row level security;

drop policy if exists "calendar_events_owner" on public.calendar_events;
create policy "calendar_events_owner" on public.calendar_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- conversations: one (for now) persistent chat thread per user with Alxioum.
-- ---------------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Alxioum',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_user_idx on public.conversations (user_id, updated_at desc);

alter table public.conversations enable row level security;

drop policy if exists "conversations_owner" on public.conversations;
create policy "conversations_owner" on public.conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- messages: chat history. user_id is denormalized onto the row (rather than
-- requiring a join through conversations) so RLS can scope it directly.
-- pending_action holds a tool call awaiting user confirmation via UI buttons;
-- it is cleared (set to null) once the user confirms or cancels.
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  pending_action jsonb,
  resolved_action jsonb,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);
create index if not exists messages_user_month_idx on public.messages (user_id, role, created_at);

alter table public.messages enable row level security;

drop policy if exists "messages_owner" on public.messages;
create policy "messages_owner" on public.messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- agent_actions: audit log of every tool execution Alxioum performs.
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

create index if not exists agent_actions_user_idx on public.agent_actions (user_id, created_at desc);

alter table public.agent_actions enable row level security;

drop policy if exists "agent_actions_owner" on public.agent_actions;
create policy "agent_actions_owner" on public.agent_actions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- profiles.plan already exists ('Free' | 'Pro' | 'Ultra'); normalize to the
-- two real V1 tiers so plan-limit checks have a stable set of values.
-- ---------------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_plan_check;
update public.profiles set plan = 'Pro' where plan = 'Ultra';
alter table public.profiles add constraint profiles_plan_check check (plan in ('Free', 'Pro'));
