-- Suivi des sorties du stock de produits reçus en remboursement en nature
-- (ventes à des tiers externes, ristournes physiques données aux membres).
-- Les entrées de ce stock sont déjà les remboursements en nature existants
-- (table remboursements, type_remboursement='nature') : cette nouvelle table
-- ne duplique pas cette donnée, elle n'ajoute que les mouvements de sortie
-- qui n'avaient encore aucune table pour les enregistrer. Le solde en cours
-- du stock, par campagne, se calcule en combinant les deux sources
-- chronologiquement côté application (voir getStockNature).
create table public.sorties_stock_nature (
  id uuid primary key default gen_random_uuid(),
  gie_id uuid not null references public.gies(id) on delete cascade,
  campagne_id uuid not null references public.campagnes(id) on delete cascade,
  type_sortie text not null check (type_sortie in ('vente', 'ristourne')),
  tiers_type text not null check (tiers_type in ('membre', 'client')),
  membre_id uuid references public.membres(id) on delete set null,
  tiers_nom text,
  quantite numeric not null check (quantite > 0),
  prix_unitaire numeric not null default 0,
  motif text,
  date_sortie date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.sorties_stock_nature enable row level security;

create policy "Acces Sorties Stock Nature par GIE"
on public.sorties_stock_nature for all
using (gie_id in (select gie_id from public.utilisateurs where id = auth.uid()));
