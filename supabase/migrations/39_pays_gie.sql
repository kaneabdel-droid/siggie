-- Pays du GIE choisi à l'inscription (lib/pays.ts) : tous les pays des devises gérées, ou « Autre pays » (code AUTRE,
-- nom saisi dans pays_nom). La devise du GIE en découle ; un GIE d'un autre pays travaille « sans unité » (AUCUNE) et
-- paie son abonnement en dollars US (abonnement_paiements.devise = 'USD').
alter table public.gies
  add column if not exists pays varchar(10),
  add column if not exists pays_nom text;

-- Identique à 19_admin_add_user_existing_gie.sql, sauf la création du GIE qui reprend pays et devise des métadonnées.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_gie_nom text;
  v_gie_id uuid;
  v_plan text;
  v_existing_gie_id uuid;
  v_role text;
  v_devise text;
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

  v_devise := coalesce(new.raw_user_meta_data->>'devise', 'XOF');
  if v_devise not in ('XOF', 'XAF', 'MRU', 'MAD', 'GNF', 'EUR', 'USD', 'AUCUNE') then
    v_devise := 'XOF';
  end if;

  insert into public.gies (nom, abonnement_statut, subscription_tier, essai_expire_le, devise, pays, pays_nom)
  values (
    v_gie_nom, 'actif', v_plan, now() + interval '7 days', v_devise,
    left(new.raw_user_meta_data->>'pays', 10), left(new.raw_user_meta_data->>'pays_nom', 100)
  )
  returning id into v_gie_id;

  insert into public.utilisateurs (id, gie_id, role)
  values (new.id, v_gie_id, 'admin');

  return new;
end;
$$ language plpgsql security definer;
