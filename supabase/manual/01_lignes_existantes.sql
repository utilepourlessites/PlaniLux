-- À exécuter MANUELLEMENT (SQL Editor de Supabase) après la migration, selon votre choix.
-- Ne fait pas partie des migrations automatiques : c'est une décision sur vos données.

-- 1) Combien de lignes sans propriétaire ?
select count(*) as lignes_sans_proprietaire from public.planner_boards where user_id is null;

-- 2a) Ce sont des données de test : les supprimer.
-- delete from public.planner_boards where user_id is null;

-- 2b) Ce sont de vraies données : les attribuer à un compte précis (remplacez l'adresse e-mail).
-- update public.planner_boards
--    set user_id = (select id from auth.users where email = 'votre@email.fr')
--  where user_id is null;

-- 3) Une fois toutes les lignes traitées, rendre le propriétaire obligatoire :
-- alter table public.planner_boards alter column user_id set not null;
