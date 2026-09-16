-- Fiche d'information du GIE : aucune colonne d'adresse/contact/identification/
-- devise/logo n'existe aujourd'hui sur `gies` (seulement nom + champs
-- d'abonnement) — tout est nouveau ici.
alter table public.gies
  add column if not exists adresse text,
  add column if not exists telephone varchar(30),
  add column if not exists email varchar(255),
  add column if not exists identification varchar(100),
  add column if not exists devise varchar(10) default 'XOF',
  add column if not exists logo_url text;

-- Écriture via RPC dédiée plutôt qu'une policy RLS UPDATE sur gies : la liste
-- de paramètres de cette fonction EST la liste blanche des champs modifiables
-- (jamais abonnement_statut/date_expiration/subscription_tier/compte_verrouille,
-- réservés au back-office super-admin). Tout utilisateur du GIE peut éditer sa
-- fiche — SIGGIE n'a pas de sous-rôle par GIE (`utilisateurs.role` vaut
-- toujours 'admin' par défaut, cf. 00_schema.sql), contrairement à D-QUINCA.
create or replace function public.update_gie_infos(
  p_nom varchar,
  p_adresse text,
  p_telephone varchar,
  p_email varchar,
  p_identification varchar,
  p_devise varchar
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_gie_id uuid;
begin
  select gie_id into v_gie_id from public.utilisateurs where id = auth.uid();
  if v_gie_id is null then
    raise exception 'Non autorisé';
  end if;

  if p_nom is null or length(trim(p_nom)) = 0 then
    raise exception 'Le nom est requis';
  end if;

  update public.gies
  set nom = trim(p_nom),
      adresse = nullif(trim(coalesce(p_adresse, '')), ''),
      telephone = nullif(trim(coalesce(p_telephone, '')), ''),
      email = nullif(trim(coalesce(p_email, '')), ''),
      identification = nullif(trim(coalesce(p_identification, '')), ''),
      devise = coalesce(p_devise, devise)
  where id = v_gie_id;
end;
$$;

-- Distincte de update_gie_infos pour la même raison que côté D-QUINCA : le
-- logo se remplace seul, sans repasser par tout le formulaire.
create or replace function public.update_gie_logo(
  p_logo_url text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_gie_id uuid;
begin
  select gie_id into v_gie_id from public.utilisateurs where id = auth.uid();
  if v_gie_id is null then
    raise exception 'Non autorisé';
  end if;

  update public.gies set logo_url = p_logo_url where id = v_gie_id;
end;
$$;

-- Bucket public en lecture (logo affiché sur PDF/pages sans session), écriture
-- restreinte à son propre dossier <gie_id>/.
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

create policy "logos_public_select" on storage.objects
  for select using (bucket_id = 'logos');

create policy "logos_own_folder_insert" on storage.objects
  for insert with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = (select gie_id::text from public.utilisateurs where id = auth.uid())
  );

create policy "logos_own_folder_update" on storage.objects
  for update using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = (select gie_id::text from public.utilisateurs where id = auth.uid())
  );

create policy "logos_own_folder_delete" on storage.objects
  for delete using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = (select gie_id::text from public.utilisateurs where id = auth.uid())
  );
