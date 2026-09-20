-- Montants du bilan annuel qui ne peuvent pas être déduits des données de gestion
-- et sont saisis à la main, par exercice : subventions et emprunts (soldes au 31/12),
-- autres produits et autres charges (flux de l'année).
create table if not exists public.bilan_saisies (
  id uuid primary key default gen_random_uuid(),
  gie_id uuid not null references public.gies(id) on delete cascade,
  annee integer not null,
  rubrique text not null check (rubrique in ('subventions', 'emprunts', 'autres_produits', 'autres_charges')),
  montant numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (gie_id, annee, rubrique)
);

alter table public.bilan_saisies enable row level security;

create policy "Acces bilan saisies par GIE"
on public.bilan_saisies for all
using (gie_id in (select gie_id from public.utilisateurs where id = auth.uid()))
with check (gie_id in (select gie_id from public.utilisateurs where id = auth.uid()));
