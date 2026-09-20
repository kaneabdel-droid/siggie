-- Ristournes en numéraire : surplus de remboursement rendu à un membre. Chaque ristourne
-- correspond à une sortie de trésorerie (transaction, type_piece = 'ristourne') et vient
-- en réduction de ce que le membre a remboursé. Les ristournes en nature restent
-- enregistrées comme sorties du stock en nature (sorties_stock_nature, type 'ristourne').
create table if not exists public.ristournes (
  id uuid primary key default gen_random_uuid(),
  gie_id uuid not null references public.gies(id) on delete cascade,
  membre_id uuid not null references public.membres(id) on delete cascade,
  montant numeric not null check (montant > 0),
  compte_id uuid references public.comptes(id) on delete restrict,
  transaction_id uuid references public.transactions(id) on delete set null,
  date_ristourne date not null default current_date,
  motif text,
  created_at timestamptz not null default now()
);

create index if not exists idx_ristournes_gie_membre on public.ristournes (gie_id, membre_id);

alter table public.ristournes enable row level security;

create policy "Acces ristournes par GIE"
on public.ristournes for all
using (gie_id in (select gie_id from public.utilisateurs where id = auth.uid()))
with check (gie_id in (select gie_id from public.utilisateurs where id = auth.uid()));
