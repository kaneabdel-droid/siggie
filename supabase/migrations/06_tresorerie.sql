-- Script 6: Ajout des comptes et mise à jour de la trésorerie

-- 1. Table des Comptes (Caisse, Banques, etc.)
create table public.comptes (
    id uuid default uuid_generate_v4() primary key,
    gie_id uuid references public.gies(id) on delete cascade not null,
    nom varchar(150) not null,
    type_compte varchar(50) not null default 'caisse', -- caisse, banque
    solde_initial numeric default 0,
    created_at timestamp with time zone default now()
);

-- Active RLS sur la table comptes
alter table public.comptes enable row level security;

-- Policy pour les comptes
create policy "Acces Comptes par GIE" 
on public.comptes for all using (gie_id in (select gie_id from public.utilisateurs where id = auth.uid()));

-- 2. Mise à jour de la table transactions
-- On ajoute la colonne compte_id pour savoir d'où sort ou entre l'argent
ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS compte_id uuid references public.comptes(id) on delete restrict;

-- 3. Ajout d'une colonne type_piece pour le rapprochement (Optionnel mais recommandé)
-- ex: 'facture_fournisseur', 'retrait_espece', 'versement'
ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS type_piece varchar(100);
