-- Pointage des prestations du matériel sur le terrain.
--
-- Chaque prestation est pointée dans son unité de travail : hectares (tracteur, moissonneuse), heures (niveleuse,
-- pelle), sacs (moissonneuse payée en part de récolte) ou une autre unité libre. Le pointeur renseigne aussi la
-- quantité obtenue (récolte) et, quand le produit l'exige, sa variété, ainsi que le téléphone du client.
--
-- Paiement en part de récolte : part_quantite = quantite_obtenue × taux_part / 100 (colonne calculée). Le montant
-- facturé est alors la valorisation de cette part (part × prix_unitaire_part), proposée par le formulaire.

-- Référentiel des produits pointés (riz, arachide, maïs…) et de l'obligation d'en préciser la variété.
create table if not exists public.materiel_produits (
  id uuid default uuid_generate_v4() primary key,
  gie_id uuid not null references public.gies(id) on delete cascade,
  nom varchar(100) not null,
  unite varchar(30) not null default 'sac',
  variete_obligatoire boolean not null default false,
  created_at timestamp with time zone default now(),
  unique (gie_id, nom)
);

alter table public.materiel_produits enable row level security;
drop policy if exists "Acces Produits materiel par GIE" on public.materiel_produits;
create policy "Acces Produits materiel par GIE"
on public.materiel_produits for all using (gie_id in (select gie_id from public.utilisateurs where id = auth.uid()));

alter table public.materiel_prestations
  add column if not exists unite varchar(10) not null default 'ha' check (unite in ('ha', 'h', 'sac', 'autre')),
  add column if not exists unite_autre varchar(30),
  add column if not exists quantite_traitee numeric not null default 0 check (quantite_traitee >= 0),
  add column if not exists tarif_unitaire numeric check (tarif_unitaire >= 0),
  add column if not exists client_telephone varchar(30),
  add column if not exists produit_id uuid references public.materiel_produits(id) on delete set null,
  add column if not exists variete varchar(100),
  add column if not exists quantite_obtenue numeric check (quantite_obtenue >= 0),
  add column if not exists unite_obtenue varchar(30),
  add column if not exists mode_paiement varchar(15) not null default 'especes' check (mode_paiement in ('especes', 'part_recolte')),
  add column if not exists taux_part numeric check (taux_part between 0 and 100),
  add column if not exists prix_unitaire_part numeric check (prix_unitaire_part >= 0),
  add column if not exists pointe_par uuid default auth.uid() references auth.users(id) on delete set null;

alter table public.materiel_prestations
  add column if not exists part_quantite numeric generated always as (
    case when mode_paiement = 'part_recolte' then round(coalesce(quantite_obtenue, 0) * coalesce(taux_part, 0) / 100, 2) end
  ) stored;

-- Les prestations existantes étaient saisies en hectares.
update public.materiel_prestations set quantite_traitee = superficie where unite = 'ha' and quantite_traitee = 0 and coalesce(superficie, 0) > 0;

create index if not exists idx_materiel_produits_gie_id on public.materiel_produits (gie_id);
create index if not exists idx_materiel_prestations_produit_id on public.materiel_prestations (produit_id);
