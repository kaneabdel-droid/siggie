-- Migration 50: Financement par intrant / service pour les crédits bancaires
-- Permet de décliner le financement du GIE par intrant ou service comme pratiqué par les banques agricoles (ex: La Banque Agricole).

-- 1. Ajout de la colonne type_financement sur la table credits
ALTER TABLE public.credits
  ADD COLUMN IF NOT EXISTS type_financement varchar(50) DEFAULT 'global';

-- 2. Création de la table credit_lignes
CREATE TABLE IF NOT EXISTS public.credit_lignes (
    id uuid default uuid_generate_v4() primary key,
    gie_id uuid references public.gies(id) on delete cascade not null,
    credit_id uuid references public.credits(id) on delete cascade not null,
    intrant_id uuid references public.intrants(id) on delete set null,
    type_rubrique varchar(50) default 'intrant' not null, -- 'intrant' ou 'service'
    designation varchar(200) not null,
    fournisseur_nom varchar(150),
    montant_accorde numeric not null default 0,
    montant_paye numeric not null default 0,
    observations text,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Index pour optimiser les jointures et requêtes par crédit et par GIE
CREATE INDEX IF NOT EXISTS idx_credit_lignes_credit_id ON public.credit_lignes(credit_id);
CREATE INDEX IF NOT EXISTS idx_credit_lignes_gie_id ON public.credit_lignes(gie_id);

-- 3. Row Level Security (RLS)
ALTER TABLE public.credit_lignes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acces Credit Lignes par GIE" ON public.credit_lignes;
CREATE POLICY "Acces Credit Lignes par GIE" 
ON public.credit_lignes FOR ALL 
USING (gie_id IN (SELECT gie_id FROM public.utilisateurs WHERE id = auth.uid()));
