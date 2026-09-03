-- Script 2: Extension du schéma avec les modules manquants

-- Table des Intrants (engrais, semences, etc.)
create table public.intrants (
    id uuid default uuid_generate_v4() primary key,
    gie_id uuid references public.gies(id) on delete cascade not null,
    campagne_id uuid references public.campagnes(id) on delete cascade,
    type_intrant varchar(100) not null,
    nom varchar(150) not null,
    quantite_stock numeric default 0,
    prix_unitaire numeric default 0,
    description text,
    created_at timestamp with time zone default now()
);

-- Table des Distributions d'intrants aux membres
create table public.distribution_intrants (
    id uuid default uuid_generate_v4() primary key,
    gie_id uuid references public.gies(id) on delete cascade not null,
    campagne_id uuid references public.campagnes(id) on delete cascade not null,
    membre_id uuid references public.membres(id) on delete cascade not null,
    intrant_id uuid references public.intrants(id) on delete cascade not null,
    quantite numeric not null,
    date_distribution date default current_date,
    created_at timestamp with time zone default now()
);

-- Table des Crédits Bancaires
create table public.credits (
    id uuid default uuid_generate_v4() primary key,
    gie_id uuid references public.gies(id) on delete cascade not null,
    campagne_id uuid references public.campagnes(id) on delete cascade not null,
    membre_id uuid references public.membres(id) on delete cascade not null,
    montant_demande numeric not null,
    but_credit text,
    statut varchar(50) default 'en_attente', -- en_attente, valide, rejete
    date_demande date default current_date,
    created_at timestamp with time zone default now()
);

-- Table des Factures
create table public.factures (
    id uuid default uuid_generate_v4() primary key,
    gie_id uuid references public.gies(id) on delete cascade not null,
    membre_id uuid references public.membres(id) on delete cascade, -- Peut être null si facture externe
    client_nom varchar(150), -- Utile si ce n'est pas un membre
    montant_total numeric not null,
    statut varchar(50) default 'impayee', -- impayee, payee
    date_emission date default current_date,
    created_at timestamp with time zone default now()
);

-- Table des Transactions (Trésorerie)
create table public.transactions (
    id uuid default uuid_generate_v4() primary key,
    gie_id uuid references public.gies(id) on delete cascade not null,
    type_transaction varchar(50) not null, -- entree, sortie
    montant numeric not null,
    motif text not null,
    date_transaction date default current_date,
    created_at timestamp with time zone default now()
);

-- Table des Matériels (Parc matériel)
create table public.materiels (
    id uuid default uuid_generate_v4() primary key,
    gie_id uuid references public.gies(id) on delete cascade not null,
    nom varchar(150) not null,
    etat varchar(50) default 'bon', -- bon, en_panne, reparation
    date_acquisition date,
    created_at timestamp with time zone default now()
);

-- Active RLS sur toutes les nouvelles tables
alter table public.intrants enable row level security;
alter table public.distribution_intrants enable row level security;
alter table public.credits enable row level security;
alter table public.factures enable row level security;
alter table public.transactions enable row level security;
alter table public.materiels enable row level security;

-- Création des Policies (Filtrage par GIE)

create policy "Acces Intrants par GIE" 
on public.intrants for all using (gie_id in (select gie_id from public.utilisateurs where id = auth.uid()));

create policy "Acces Distribution Intrants par GIE" 
on public.distribution_intrants for all using (gie_id in (select gie_id from public.utilisateurs where id = auth.uid()));

create policy "Acces Credits par GIE" 
on public.credits for all using (gie_id in (select gie_id from public.utilisateurs where id = auth.uid()));

create policy "Acces Factures par GIE" 
on public.factures for all using (gie_id in (select gie_id from public.utilisateurs where id = auth.uid()));

create policy "Acces Transactions par GIE" 
on public.transactions for all using (gie_id in (select gie_id from public.utilisateurs where id = auth.uid()));

create policy "Acces Materiels par GIE" 
on public.materiels for all using (gie_id in (select gie_id from public.utilisateurs where id = auth.uid()));
