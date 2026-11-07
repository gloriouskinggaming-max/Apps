-- Shuttle: per-user fitness data.
-- Run this in the Supabase dashboard (SQL Editor -> New query -> paste -> Run),
-- or with the Supabase CLI: `supabase db push`.
--
-- Every table has Row Level Security so a signed-in user can only read and
-- write their own rows. Deleting the auth user deletes all of their rows.

create table if not exists public.shuttle_profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  profile jsonb,
  recent_foods jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.shuttle_diary_days (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  log jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create table if not exists public.shuttle_workouts (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  date date not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.shuttle_weights (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  lb numeric(6, 1) not null check (lb > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create table if not exists public.shuttle_custom_foods (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  food jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists shuttle_workouts_user_date on public.shuttle_workouts (user_id, date desc);

-- Row Level Security: owner-only access on every table.
do $$
declare t text;
begin
  foreach t in array array['shuttle_profiles', 'shuttle_diary_days', 'shuttle_workouts', 'shuttle_weights', 'shuttle_custom_foods'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "owner access" on public.%I', t);
    execute format(
      'create policy "owner access" on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      t
    );
  end loop;
end $$;

-- Lets a signed-in user delete their own account (required by the App Store).
-- Runs with elevated rights but can only ever delete the caller.
create or replace function public.delete_user()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke all on function public.delete_user() from public, anon;
grant execute on function public.delete_user() to authenticated;
