-- État de suivi budgétaire (remplace la notion d'"états financiers") : pour
-- chaque campagne, un budget Exploitation et un budget Matériel, construits à
-- partir de rubriques/sous-rubriques librement créées, avec une prévision
-- saisie en début de campagne et une réalisation calculée automatiquement par
-- recoupement des imputations posées sur les opérations de caisse/banque.

-- 1. La table imputations (Rubriques comptables) sert désormais aussi de
-- référentiel de rubriques budgétaires : "libelle" = Rubrique, "compte" =
-- Sous-Rubrique / Poste. On ajoute une catégorie pour savoir si une rubrique
-- appartient au budget Exploitation ou au budget Matériel.
alter table public.imputations
  add column if not exists categorie text not null default 'exploitation'
  check (categorie in ('exploitation', 'materiel'));

-- Le référentiel existant mélangeait des imputations de trésorerie génériques
-- non pensées pour porter un budget ; on repart d'une liste vide que
-- l'administrateur reconstruit (rubrique par rubrique, catégorisée) depuis la
-- configuration de campagne. Les transactions déjà imputées perdent seulement
-- leur étiquette (imputation_id passe à NULL via le ON DELETE SET NULL déjà
-- en place), elles ne sont pas supprimées.
delete from public.imputations;

-- 2. Pour calculer la réalisation d'une rubrique sur une campagne donnée, il
-- faut savoir à quelle campagne une opération de caisse/banque se rattache.
alter table public.transactions
  add column if not exists campagne_id uuid references public.campagnes(id) on delete set null;

create index if not exists idx_transactions_campagne_imputation
  on public.transactions (campagne_id, imputation_id);

-- 3. Prévisions budgétaires : un montant prévu par rubrique et par campagne.
-- Le type de budget (Exploitation / Matériel) se déduit de la catégorie de
-- l'imputation liée, il n'est pas dupliqué ici.
create table public.budget_previsions (
  id uuid primary key default gen_random_uuid(),
  gie_id uuid not null references public.gies(id) on delete cascade,
  campagne_id uuid not null references public.campagnes(id) on delete cascade,
  imputation_id uuid not null references public.imputations(id) on delete cascade,
  montant_prevu numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campagne_id, imputation_id)
);

alter table public.budget_previsions enable row level security;

create policy "Acces Budget Previsions par GIE"
on public.budget_previsions for all
using (gie_id in (select gie_id from public.utilisateurs where id = auth.uid()));
