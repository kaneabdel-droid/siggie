-- Permet à l'administrateur plateforme de créer un compte utilisateur supplémentaire
-- pour un GIE déjà existant (ex: un second gérant), sans que le trigger d'inscription
-- ne lui crée automatiquement un nouveau GIE comme pour une inscription normale.
-- Le server action passe `existing_gie_id` (et `role`) dans les métadonnées du
-- compte auth lors de sa création ; le trigger détecte ce cas et rattache
-- simplement l'utilisateur au GIE indiqué au lieu d'en créer un nouveau.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_gie_nom text;
  v_gie_id uuid;
  v_plan text;
  v_existing_gie_id uuid;
  v_role text;
begin
  v_existing_gie_id := (new.raw_user_meta_data->>'existing_gie_id')::uuid;

  if v_existing_gie_id is not null then
    v_role := coalesce(new.raw_user_meta_data->>'role', 'employe');
    insert into public.utilisateurs (id, gie_id, role)
    values (new.id, v_existing_gie_id, v_role);
    return new;
  end if;

  v_gie_nom := coalesce(new.raw_user_meta_data->>'gie_nom', 'GIE Sans Nom');

  v_plan := coalesce(new.raw_user_meta_data->>'plan', 'standard');
  if v_plan not in ('standard', 'medium', 'premium') then
    v_plan := 'standard';
  end if;

  insert into public.gies (nom, abonnement_statut, subscription_tier, essai_expire_le)
  values (v_gie_nom, 'actif', v_plan, now() + interval '7 days')
  returning id into v_gie_id;

  insert into public.utilisateurs (id, gie_id, role)
  values (new.id, v_gie_id, 'admin');

  return new;
end;
$$ language plpgsql security definer;
