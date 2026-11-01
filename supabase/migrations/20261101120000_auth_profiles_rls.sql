-- PlaniLux — comptes utilisateurs, profils et sécurité par ligne (RLS).
-- Idempotente : peut être rejouée sans erreur.

-- ============================================================
-- 0. Table des tableaux (création propre si environnement neuf)
-- ============================================================
create table if not exists public.planner_boards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind text not null default 'school',
  color text not null default '#c6b8f5',
  events jsonb not null default '[]'::jsonb,
  favorite boolean not null default false,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 1. Profils (un par compte, créé automatiquement à l'inscription)
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 60),
  workspace_name text not null default '' check (char_length(workspace_name) <= 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists workspace_name text not null default '' check (char_length(workspace_name) <= 60);
alter table public.profiles enable row level security;
alter table public.profiles force row level security;
revoke all on public.profiles from anon;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, workspace_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), ''),
    ''
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Comptes déjà existants
insert into public.profiles (id, display_name, workspace_name)
select u.id, coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), ''), ''
from auth.users u
on conflict (id) do nothing;

-- ============================================================
-- 2. Mise à jour automatique de updated_at
-- ============================================================
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

drop trigger if exists planner_boards_set_updated_at on public.planner_boards;
create trigger planner_boards_set_updated_at
  before update on public.planner_boards
  for each row execute function public.set_updated_at();

-- ============================================================
-- 3. Propriétaire des tableaux + RLS
-- ============================================================
alter table public.planner_boards
  add column if not exists user_id uuid references auth.users (id) on delete cascade default auth.uid();

create index if not exists planner_boards_user_updated_idx on public.planner_boards (user_id, updated_at desc);

-- Contraintes de sécurité
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'planner_boards_kind_chk') then
    alter table public.planner_boards
      add constraint planner_boards_kind_chk
      check (kind in ('school', 'weekly', 'monthly', 'daily', 'blank')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'planner_boards_title_chk') then
    alter table public.planner_boards
      add constraint planner_boards_title_chk
      check (char_length(title) between 1 and 100) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'planner_boards_color_chk') then
    alter table public.planner_boards
      add constraint planner_boards_color_chk
      check (color ~* '^#[0-9a-f]{3,8}$') not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'planner_boards_events_chk') then
    alter table public.planner_boards
      add constraint planner_boards_events_chk
      check (jsonb_typeof(events) = 'array' and jsonb_array_length(events) <= 2000) not valid;
  end if;
end
$$;

alter table public.planner_boards enable row level security;
alter table public.planner_boards force row level security;
revoke all on public.planner_boards from anon;

drop policy if exists "boards_select_own" on public.planner_boards;
create policy "boards_select_own" on public.planner_boards
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "boards_insert_own" on public.planner_boards;
create policy "boards_insert_own" on public.planner_boards
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "boards_update_own" on public.planner_boards;
create policy "boards_update_own" on public.planner_boards
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "boards_delete_own" on public.planner_boards;
create policy "boards_delete_own" on public.planner_boards
  for delete to authenticated using ((select auth.uid()) = user_id);
