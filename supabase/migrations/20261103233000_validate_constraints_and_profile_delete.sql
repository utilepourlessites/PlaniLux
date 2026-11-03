-- PlaniLux — Validation des contraintes et ajout de la politique DELETE sur profiles
-- Idempotente : peut être rejouée sans erreur.

-- 1. Validation des contraintes d'intégrité sur planner_boards
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'planner_boards_kind_chk') then
    alter table public.planner_boards validate constraint planner_boards_kind_chk;
  end if;
  if exists (select 1 from pg_constraint where conname = 'planner_boards_title_chk') then
    alter table public.planner_boards validate constraint planner_boards_title_chk;
  end if;
  if exists (select 1 from pg_constraint where conname = 'planner_boards_color_chk') then
    alter table public.planner_boards validate constraint planner_boards_color_chk;
  end if;
  if exists (select 1 from pg_constraint where conname = 'planner_boards_events_chk') then
    alter table public.planner_boards validate constraint planner_boards_events_chk;
  end if;
end
$$;

-- 2. Politique de suppression sur public.profiles
drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles
  for delete to authenticated
  using ((select auth.uid()) = id);
