-- Triply database schema for Supabase (Postgres).
-- Run this once in your Supabase project's SQL Editor (Dashboard -> SQL Editor -> New query -> paste -> Run).
--
-- Every table is scoped by Row Level Security so a signed-in user can only
-- ever see trips they own or have been added to as a member, and only ever
-- write to trip data for trips they belong to.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default 'You',
  email text not null default '',
  avatar_initials text not null default 'U',
  plan text not null default 'Free' check (plan in ('Free', 'Travel Pro')),
  interests jsonb not null default '[]',
  food_preferences jsonb not null default '[]',
  travel_style text not null default 'Balanced' check (travel_style in ('Relaxed', 'Balanced', 'Packed')),
  home_city text not null default '',
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  notification_prefs jsonb not null default '{"flights":true,"polls":true,"conflicts":true,"tripUpdates":true,"chat":true}',
  seeded boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- trips
-- ---------------------------------------------------------------------------
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country_flag text not null default '🌍',
  cities jsonb not null default '[]',
  start_date date not null,
  end_date date not null,
  cover_gradient text not null default 'from-indigo-400 via-sky-400 to-emerald-400',
  cover_emoji text not null default '🧳',
  budget numeric,
  currency text not null default 'EUR',
  interests jsonb not null default '[]',
  food_preferences jsonb not null default '[]',
  travel_style text not null default 'Balanced' check (travel_style in ('Relaxed', 'Balanced', 'Packed')),
  owner_id uuid not null references auth.users (id) on delete cascade,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- trip_members
-- ---------------------------------------------------------------------------
create table if not exists public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  name text not null,
  avatar_initials text not null default 'U',
  role text not null default 'Traveler' check (role in ('Organizer', 'Traveler')),
  responsibility text,
  status text not null default 'joined' check (status in ('invited', 'joined')),
  joined_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- helper functions used by RLS policies below (defined after trip_members
-- so is_trip_member's query can resolve against it)
-- ---------------------------------------------------------------------------
create or replace function public.is_trip_owner(trip uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.trips where id = trip and owner_id = auth.uid());
$$;

create or replace function public.is_trip_member(trip uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    public.is_trip_owner(trip)
    or exists (
      select 1 from public.trip_members
      where trip_id = trip and user_id = auth.uid()
    );
$$;

-- ---------------------------------------------------------------------------
-- itinerary_items
-- ---------------------------------------------------------------------------
create table if not exists public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  date date not null,
  start_time text not null,
  end_time text not null,
  type text not null default 'activity',
  name text not null,
  emoji text not null default '📍',
  location text,
  description text,
  cost numeric,
  participant_ids jsonb not null default '[]',
  notes text,
  booking_ref text,
  map_x numeric,
  map_y numeric,
  ai_generated boolean not null default false,
  item_order numeric not null default 0
);

-- ---------------------------------------------------------------------------
-- expenses
-- ---------------------------------------------------------------------------
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  name text not null,
  amount numeric not null,
  currency text not null default 'EUR',
  paid_by text not null,
  participant_ids jsonb not null default '[]',
  custom_split jsonb,
  category text not null default 'Other',
  date date not null,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- polls / poll_options / poll_votes
-- ---------------------------------------------------------------------------
create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  question text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_by text not null,
  added_to_itinerary boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls (id) on delete cascade,
  text text not null,
  emoji text
);

create table if not exists public.poll_votes (
  poll_id uuid not null references public.polls (id) on delete cascade,
  option_id uuid not null references public.poll_options (id) on delete cascade,
  member_id text not null,
  primary key (poll_id, member_id)
);

-- ---------------------------------------------------------------------------
-- messages (trip chat)
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  sender_id text not null,
  content text not null,
  kind text not null default 'text' check (kind in ('text', 'ai', 'system')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- documents (booking imports)
-- ---------------------------------------------------------------------------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  file_name text not null,
  kind text not null default 'other',
  extracted_data jsonb not null default '{}',
  added_to_itinerary boolean not null default false,
  uploaded_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- notifications (per-user inbox)
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  trip_id uuid references public.trips (id) on delete cascade,
  title text not null,
  body text not null default '',
  kind text not null default 'system',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- saved_places
-- ---------------------------------------------------------------------------
create table if not exists public.saved_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  category text not null default 'Other',
  city text not null default '',
  emoji text not null default '📍'
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'profiles', 'trips', 'trip_members', 'itinerary_items', 'expenses',
      'polls', 'poll_options', 'poll_votes', 'messages', 'documents',
      'notifications', 'saved_places'
    ])
  loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;

-- profiles: id IS the user id
drop policy if exists "profiles_owner" on public.profiles;
create policy "profiles_owner" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- trips: visible/editable by the owner; visible (read-only via app logic) to members
drop policy if exists "trips_select" on public.trips;
create policy "trips_select" on public.trips
  for select using (public.is_trip_member(id));

drop policy if exists "trips_owner_write" on public.trips;
create policy "trips_owner_write" on public.trips
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- trip_members: any member can see the roster; only the trip owner manages it
drop policy if exists "trip_members_select" on public.trip_members;
create policy "trip_members_select" on public.trip_members
  for select using (public.is_trip_member(trip_id));

drop policy if exists "trip_members_owner_write" on public.trip_members;
create policy "trip_members_owner_write" on public.trip_members
  for insert with check (public.is_trip_owner(trip_id));
drop policy if exists "trip_members_owner_update" on public.trip_members;
create policy "trip_members_owner_update" on public.trip_members
  for update using (public.is_trip_owner(trip_id));
drop policy if exists "trip_members_owner_delete" on public.trip_members;
create policy "trip_members_owner_delete" on public.trip_members
  for delete using (public.is_trip_owner(trip_id));

-- shared trip content: any trip member can read and write
do $$
declare
  t text;
begin
  for t in select unnest(array['itinerary_items', 'expenses', 'polls', 'messages', 'documents'])
  loop
    execute format('drop policy if exists "%s_members" on public.%I;', t, t);
    execute format(
      'create policy "%s_members" on public.%I for all using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));',
      t, t
    );
  end loop;
end $$;

drop policy if exists "poll_options_members" on public.poll_options;
create policy "poll_options_members" on public.poll_options
  for all using (public.is_trip_member((select trip_id from public.polls where id = poll_id)))
  with check (public.is_trip_member((select trip_id from public.polls where id = poll_id)));

drop policy if exists "poll_votes_members" on public.poll_votes;
create policy "poll_votes_members" on public.poll_votes
  for all using (public.is_trip_member((select trip_id from public.polls where id = poll_id)))
  with check (public.is_trip_member((select trip_id from public.polls where id = poll_id)));

-- notifications / saved_places: owner only
drop policy if exists "notifications_owner" on public.notifications;
create policy "notifications_owner" on public.notifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "saved_places_owner" on public.saved_places;
create policy "saved_places_owner" on public.saved_places
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

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
-- Lock down direct RPC access to internal helper/trigger functions. Supabase
-- auto-grants EXECUTE on new public-schema functions to anon/authenticated;
-- these three should only run as part of RLS policy evaluation or the auth
-- trigger above, never called directly as a public REST endpoint.
-- `authenticated` still needs EXECUTE on the two is_trip_* functions since
-- that's the role RLS policies run as -- revoking it would break every trip
-- query for signed-in users.
-- ---------------------------------------------------------------------------
revoke execute on function public.handle_new_user() from anon, authenticated, public;

revoke execute on function public.is_trip_owner(uuid) from anon, authenticated, public;
grant execute on function public.is_trip_owner(uuid) to authenticated;

revoke execute on function public.is_trip_member(uuid) from anon, authenticated, public;
grant execute on function public.is_trip_member(uuid) to authenticated;
