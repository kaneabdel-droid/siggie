-- Trigger pour la création automatique du GIE et de l'utilisateur à l'inscription

-- 1. Fonction exécutée par le trigger
create or replace function public.handle_new_user() 
returns trigger as $$
declare
  v_gie_nom text;
  v_gie_id uuid;
begin
  -- Récupérer le nom du GIE depuis les métadonnées (envoyé lors du signUp)
  -- Si vide, on donne un nom par défaut "GIE Nouveau"
  v_gie_nom := coalesce(new.raw_user_meta_data->>'gie_nom', 'GIE Sans Nom');

  -- Insérer le nouveau GIE
  insert into public.gies (nom, abonnement_statut)
  values (v_gie_nom, 'actif')
  returning id into v_gie_id;

  -- Insérer l'utilisateur dans la table publique, rattaché à ce GIE
  insert into public.utilisateurs (id, gie_id, role)
  values (new.id, v_gie_id, 'admin');

  return new;
end;
$$ language plpgsql security definer;

-- 2. Création du trigger sur auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Pour tester que tout fonctionne sans bloquer
-- Note: les policies sur les tables gies et utilisateurs pourraient bloquer
-- le trigger si "security definer" n'était pas présent, mais nous l'avons ajouté.
