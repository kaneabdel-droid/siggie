-- Mise à jour du trigger pour prendre en compte le plan d'abonnement lors de la création

create or replace function public.handle_new_user() 
returns trigger as $$
declare
  v_gie_nom text;
  v_gie_id uuid;
  v_plan text;
begin
  -- Récupérer le nom du GIE depuis les métadonnées (envoyé lors du signUp)
  v_gie_nom := coalesce(new.raw_user_meta_data->>'gie_nom', 'GIE Sans Nom');
  
  -- Récupérer le plan choisi depuis les métadonnées (standard, medium, premium)
  v_plan := coalesce(new.raw_user_meta_data->>'plan', 'standard');

  -- S'assurer que le plan est valide
  if v_plan not in ('standard', 'medium', 'premium') then
    v_plan := 'standard';
  end if;

  -- Insérer le nouveau GIE avec le niveau d'abonnement correct
  insert into public.gies (nom, abonnement_statut, subscription_tier)
  values (v_gie_nom, 'actif', v_plan)
  returning id into v_gie_id;

  -- Insérer l'utilisateur dans la table publique, rattaché à ce GIE
  insert into public.utilisateurs (id, gie_id, role)
  values (new.id, v_gie_id, 'admin');

  return new;
end;
$$ language plpgsql security definer;
