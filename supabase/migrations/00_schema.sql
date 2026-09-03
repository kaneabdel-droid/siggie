-- Schéma initial pour SIGGIE

-- Activer les extensions nécessaires
create extension if not exists "uuid-ossp";

-- Table des GIEs (Les locataires)
create table public.gies (
    id uuid default uuid_generate_v4() primary key,
    nom varchar(255) not null,
    abonnement_statut varchar(50) default 'actif',
    date_expiration timestamp with time zone,
    created_at timestamp with time zone default now()
);

-- Table des Utilisateurs (liée à auth.users de Supabase)
create table public.utilisateurs (
    id uuid references auth.users not null primary key,
    gie_id uuid references public.gies(id) on delete cascade not null,
    role varchar(50) default 'admin',
    created_at timestamp with time zone default now()
);

-- Table des Membres
create table public.membres (
    id uuid default uuid_generate_v4() primary key,
    gie_id uuid references public.gies(id) on delete cascade not null,
    nom varchar(100) not null,
    prenom varchar(100) not null,
    village varchar(150),
    telephone varchar(20),
    statut varchar(50) default 'actif',
    created_at timestamp with time zone default now()
);

-- Table des Campagnes
create table public.campagnes (
    id uuid default uuid_generate_v4() primary key,
    gie_id uuid references public.gies(id) on delete cascade not null,
    nom varchar(150) not null,
    date_debut date,
    date_fin date,
    mode_remboursement varchar(50) default 'mixte',
    produit_collecte varchar(100),
    prix_collecte numeric,
    poids_standard numeric,
    delai_remboursement date,
    statut varchar(50) default 'en_cours',
    created_at timestamp with time zone default now()
);

-- Active RLS sur toutes les tables
alter table public.gies enable row level security;
alter table public.utilisateurs enable row level security;
alter table public.membres enable row level security;
alter table public.campagnes enable row level security;

-- Policies (Garantir qu'un utilisateur ne voit que les données de son GIE)

-- Utilisateurs voient leur propre profil
create policy "Les utilisateurs peuvent voir leur profil" 
on public.utilisateurs for select using (auth.uid() = id);

-- Membres (Lecture/Ecriture pour les utilisateurs du même GIE)
create policy "Acces Membres par GIE" 
on public.membres for all using (
    gie_id in (select gie_id from public.utilisateurs where id = auth.uid())
);

-- Campagnes (Lecture/Ecriture pour les utilisateurs du même GIE)
create policy "Acces Campagnes par GIE" 
on public.campagnes for all using (
    gie_id in (select gie_id from public.utilisateurs where id = auth.uid())
);
