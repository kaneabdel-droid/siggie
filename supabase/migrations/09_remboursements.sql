-- Script 9: Table des Remboursements

create table public.remboursements (
    id uuid default uuid_generate_v4() primary key,
    gie_id uuid references public.gies(id) on delete cascade not null,
    facture_id uuid references public.factures(id) on delete cascade not null,
    membre_id uuid references public.membres(id) on delete cascade not null,
    type_remboursement varchar(50) not null, -- 'espece' ou 'nature'
    montant_fcfa numeric not null, -- Equivalent en argent, qu'il soit payé en nature ou espèce
    quantite_nature numeric, -- Seulement pour le type 'nature' (ex: kg d'arachide)
    date_paiement timestamp with time zone default now(),
    created_at timestamp with time zone default now()
);

-- RLS
alter table public.remboursements enable row level security;

-- Policy
create policy "Acces Remboursements par GIE" 
on public.remboursements for all using (gie_id in (select gie_id from public.utilisateurs where id = auth.uid()));

-- Modification table factures pour ajouter le montant payé et le reste à payer
ALTER TABLE public.factures ADD COLUMN IF NOT EXISTS montant_paye numeric default 0;
ALTER TABLE public.factures ADD COLUMN IF NOT EXISTS campagne_id uuid references public.campagnes(id) on delete cascade;
