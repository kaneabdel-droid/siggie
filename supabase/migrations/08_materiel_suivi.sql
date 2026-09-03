-- Script 8: Prestations et Consommations du Matériel

-- 1. Table des Prestations (Recettes / Travaux effectués)
create table public.materiel_prestations (
    id uuid default uuid_generate_v4() primary key,
    gie_id uuid references public.gies(id) on delete cascade not null,
    materiel_id uuid references public.materiels(id) on delete cascade not null,
    campagne_id uuid references public.campagnes(id) on delete set null, -- Optionnel
    type_prestation varchar(100) not null, -- ex: Offset, Moisson, Labour
    client_nom varchar(150),
    superficie numeric default 0, -- en hectares par exemple
    montant_facture numeric not null default 0,
    date_prestation date not null,
    created_at timestamp with time zone default now()
);

-- Active RLS
alter table public.materiel_prestations enable row level security;
create policy "Acces Prestations par GIE" 
on public.materiel_prestations for all using (gie_id in (select gie_id from public.utilisateurs where id = auth.uid()));


-- 2. Table des Consommations (Dépenses / Entretien)
create table public.materiel_consommations (
    id uuid default uuid_generate_v4() primary key,
    gie_id uuid references public.gies(id) on delete cascade not null,
    materiel_id uuid references public.materiels(id) on delete cascade not null,
    campagne_id uuid references public.campagnes(id) on delete set null, -- Optionnel
    type_consommation varchar(100) not null, -- ex: Carburant, Huile, Réparation
    quantite numeric default 0,
    montant_total numeric not null default 0,
    fournisseur varchar(150),
    date_consommation date not null,
    created_at timestamp with time zone default now()
);

-- Active RLS
alter table public.materiel_consommations enable row level security;
create policy "Acces Consommations par GIE" 
on public.materiel_consommations for all using (gie_id in (select gie_id from public.utilisateurs where id = auth.uid()));
