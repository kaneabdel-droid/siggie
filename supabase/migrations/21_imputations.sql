-- Liste de référence des imputations comptables (catégories d'affectation des
-- opérations de trésorerie), propre à chaque GIE. La lecture est ouverte à
-- tout le GIE (nécessaire pour peupler le menu déroulant lors de la saisie
-- d'une opération de caisse/banque) ; la création/modification/suppression
-- est réservée à l'administrateur du GIE (utilisateurs.role = 'admin'),
-- vérifié côté server actions comme le reste de l'application (aucune table
-- de ce projet n'encode de restriction par rôle dans ses policies RLS).
create table public.imputations (
  id uuid primary key default gen_random_uuid(),
  gie_id uuid not null references public.gies(id) on delete cascade,
  libelle text not null,
  compte text not null,
  created_at timestamptz not null default now()
);

alter table public.imputations enable row level security;

create policy "Acces Imputations par GIE"
on public.imputations for all
using (gie_id in (select gie_id from public.utilisateurs where id = auth.uid()));

alter table public.transactions
  add column imputation_id uuid references public.imputations(id) on delete set null;
