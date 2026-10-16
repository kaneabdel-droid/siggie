-- Migration 51: Validation des superficies après le tour de casier de contrôle des surfaces emblavées
-- Rempli par le chef d'exploitation pour chaque campagne agricole.

alter table public.campagne_membres
  add column if not exists superficie_validee numeric,
  add column if not exists casier varchar(100),
  add column if not exists statut_validation varchar(50) not null default 'en_attente' check (statut_validation in ('en_attente', 'valide', 'partiel', 'non_emblave', 'litige')),
  add column if not exists date_controle date,
  add column if not exists controleur varchar(150),
  add column if not exists observations text,
  add column if not exists valide_at timestamptz,
  add column if not exists valide_par uuid references auth.users(id) on delete set null;

-- Index de performance pour les filtres par campagne et statut de validation
create index if not exists idx_campagne_membres_statut_val on public.campagne_membres (campagne_id, statut_validation);
create index if not exists idx_campagne_membres_casier on public.campagne_membres (campagne_id, casier);

-- Solde initial du membre (reprise de créance ou dette antérieure au démarrage sur SIGGIE)
alter table public.membres
  add column if not exists solde_initial numeric default 0;

