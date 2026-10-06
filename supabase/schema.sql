-- Tibyan optional accounts + private cloud sync (Supabase/Postgres)
-- Run this file in the Supabase SQL Editor for the project used by the app.
-- All rows are scoped to auth.uid(); do not put the service-role key in the browser.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  account_type text not null default 'muslim'
    check (account_type in ('non_muslim', 'new_muslim', 'muslim', 'researcher')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tibyan_user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.tibyan_user_data enable row level security;

-- Profiles: a signed-in user can read and update only their own profile.
drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Users can delete their own profile" on public.profiles;
create policy "Users can delete their own profile"
  on public.profiles for delete to authenticated
  using ((select auth.uid()) = id);

-- Cloud state: select/insert/update/delete are restricted to the matching account.
drop policy if exists "Users can read their own Tibyan data" on public.tibyan_user_data;
create policy "Users can read their own Tibyan data"
  on public.tibyan_user_data for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own Tibyan data" on public.tibyan_user_data;
create policy "Users can insert their own Tibyan data"
  on public.tibyan_user_data for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own Tibyan data" on public.tibyan_user_data;
create policy "Users can update their own Tibyan data"
  on public.tibyan_user_data for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own Tibyan data" on public.tibyan_user_data;
create policy "Users can delete their own Tibyan data"
  on public.tibyan_user_data for delete to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists tibyan_user_data_set_updated_at on public.tibyan_user_data;
create trigger tibyan_user_data_set_updated_at
  before update on public.tibyan_user_data
  for each row execute function public.set_updated_at();

-- A new Auth user gets a profile from their selected sign-up category.
create or replace function public.handle_new_tibyan_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_type text := new.raw_user_meta_data ->> 'account_type';
begin
  if selected_type is null or selected_type not in ('non_muslim', 'new_muslim', 'muslim', 'researcher') then
    selected_type := 'muslim';
  end if;

  insert into public.profiles (id, display_name, account_type)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    selected_type
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_tibyan_profile on auth.users;
create trigger on_auth_user_created_tibyan_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_tibyan_user();

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.tibyan_user_data to authenticated;
