-- Sépare la définition d'un intrant (catalogue) de l'enregistrement d'un achat
-- réel : fournisseur, prix et quantité varient d'un achat à l'autre, alors que
-- le formulaire "Nouvel Intrant" ne fait que créer la fiche produit. Chaque
-- achat met à jour le stock ET le prix/fournisseur courants de l'intrant
-- (utilisés pour la facturation des campagnes), tout en gardant un historique.
create table public.achats_intrants (
  id uuid primary key default gen_random_uuid(),
  gie_id uuid not null references public.gies(id) on delete cascade,
  intrant_id uuid not null references public.intrants(id) on delete cascade,
  quantite numeric not null,
  prix_unitaire numeric not null,
  fournisseur text,
  date_achat date not null default current_date,
  numero_facture text,
  created_at timestamptz not null default now()
);

alter table public.achats_intrants enable row level security;

create policy "Acces Achats Intrants par GIE"
on public.achats_intrants for all
using (gie_id in (select gie_id from public.utilisateurs where id = auth.uid()));
