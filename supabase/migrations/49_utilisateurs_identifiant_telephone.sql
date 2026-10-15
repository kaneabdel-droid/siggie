-- Permet la création d'utilisateurs sans adresse e-mail obligatoire (collaborateurs, caissiers, magasiniers).
-- Seul l'administrateur client a l'obligation de renseigner une adresse e-mail.
-- Les autres utilisateurs peuvent se connecter avec un identifiant unique (ex: moussa_caisse) ou leur numéro de téléphone.

alter table public.utilisateurs
  add column if not exists identifiant varchar(100) unique,
  add column if not exists telephone varchar(30),
  add column if not exists nom_complet varchar(150);

create index if not exists idx_utilisateurs_identifiant on public.utilisateurs (identifiant);
create index if not exists idx_utilisateurs_telephone on public.utilisateurs (telephone);

-- Mise à jour du trigger d'inscription pour enregistrer l'identifiant, le téléphone et le nom complet
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_gie_nom text;
  v_gie_id uuid;
  v_plan text;
  v_existing_gie_id uuid;
  v_role text;
  v_devise text;
  v_identifiant text;
  v_telephone text;
  v_nom_complet text;
begin
  v_existing_gie_id := (new.raw_user_meta_data->>'existing_gie_id')::uuid;
  v_identifiant := nullif(trim(new.raw_user_meta_data->>'identifiant'), '');
  v_telephone := nullif(trim(new.raw_user_meta_data->>'telephone'), '');
  v_nom_complet := nullif(trim(new.raw_user_meta_data->>'nom_complet'), '');

  -- Cas 1 : Création d'un collaborateur au sein d'un GIE existant
  if v_existing_gie_id is not null then
    v_role := coalesce(new.raw_user_meta_data->>'role', 'employe');
    insert into public.utilisateurs (id, gie_id, role, identifiant, telephone, nom_complet)
    values (new.id, v_existing_gie_id, v_role, v_identifiant, v_telephone, v_nom_complet);
    return new;
  end if;

  -- Cas 2 : Inscription normale d'un nouveau GIE (Administrateur Client)
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

  insert into public.utilisateurs (id, gie_id, role, identifiant, telephone, nom_complet)
  values (new.id, v_gie_id, 'admin', v_identifiant, v_telephone, v_nom_complet);

  return new;
end;
$$ language plpgsql security definer;
