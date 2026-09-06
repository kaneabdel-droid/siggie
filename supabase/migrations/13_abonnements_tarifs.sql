-- Table des tarifs d'abonnements
-- gen_random_uuid() est natif à Postgres 13+ (pas besoin de l'extension uuid-ossp,
-- jamais activée sur ce projet — les tables précédentes ont été créées via l'éditeur
-- Supabase, qui utilise gen_random_uuid() par défaut).
create table public.tarif_abonnement (
    id uuid default gen_random_uuid() primary key,
    niveau varchar(50) not null unique,
    prix_annuel numeric not null,
    description text,
    created_at timestamp with time zone default now()
);

-- Insertion des tarifs par defaut
insert into public.tarif_abonnement (niveau, prix_annuel, description) values
('standard', 50000, 'Abonnement Standard - Gestion basique'),
('medium', 75000, 'Abonnement Medium - Gestion avancee sans etats financiers'),
('premium', 100000, 'Abonnement Premium - Acces total');

-- Ajout du niveau d'abonnement au GIE
alter table public.gies add column subscription_tier varchar(50) default 'standard' references public.tarif_abonnement(niveau);

-- Active RLS sur la table des tarifs
alter table public.tarif_abonnement enable row level security;

-- Tout le monde peut voir les tarifs
create policy "Les tarifs sont publics" 
on public.tarif_abonnement for select using (true);
