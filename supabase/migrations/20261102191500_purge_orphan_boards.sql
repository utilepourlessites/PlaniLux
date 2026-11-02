-- PlaniLux : Purge des anciens tableaux de test sans propriétaire (données orphelines)
-- Idempotente : ne supprime que les tableaux n'appartenant à aucun utilisateur authentifié.
delete from public.planner_boards where user_id is null;
