-- Clients externes au GIE (acheteurs du stock reçu en remboursement en nature) :
-- entité propre plutôt qu'un simple texte libre, pour pouvoir suivre un relevé
-- de compte par client (ventes + paiements reçus, solde progressif), comme pour
-- un membre. Les ventes existantes (sorties_stock_nature.tiers_nom en texte
-- libre) restent lisibles telles quelles ; les nouvelles ventes se rattachent
-- à un client_id.
create table public.clients_externes (
  id uuid primary key default gen_random_uuid(),
  gie_id uuid not null references public.gies(id) on delete cascade,
  nom text not null,
  telephone text,
  created_at timestamptz not null default now()
);

alter table public.clients_externes enable row level security;

create policy "Acces Clients Externes par GIE"
on public.clients_externes for all
using (gie_id in (select gie_id from public.utilisateurs where id = auth.uid()));

alter table public.sorties_stock_nature
  add column if not exists client_id uuid references public.clients_externes(id) on delete set null;

-- Paiements reçus d'un client externe, en remboursement de ventes à crédit.
create table public.paiements_clients (
  id uuid primary key default gen_random_uuid(),
  gie_id uuid not null references public.gies(id) on delete cascade,
  client_id uuid not null references public.clients_externes(id) on delete cascade,
  montant numeric not null check (montant > 0),
  date_paiement date not null default current_date,
  motif text,
  created_at timestamptz not null default now()
);

alter table public.paiements_clients enable row level security;

create policy "Acces Paiements Clients par GIE"
on public.paiements_clients for all
using (gie_id in (select gie_id from public.utilisateurs where id = auth.uid()));
