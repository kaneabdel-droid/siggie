-- =========================================================================================
-- Modélisation de la base de données pour le module Pharmacie (D-PHARMA)
-- =========================================================================================

-- 1. Table des médicaments (Catalogue global ou par GIE)
CREATE TABLE IF NOT EXISTS public.medicaments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code_barres VARCHAR(255) UNIQUE,
    nom VARCHAR(255) NOT NULL,
    description TEXT,
    principe_actif VARCHAR(255),
    soumis_ordonnance BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 2. Stocks de la pharmacie (lié au gie_id existant dans le SaaS)
CREATE TABLE IF NOT EXISTS public.stocks_pharmacie (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gie_id UUID NOT NULL REFERENCES public.gies(id) ON DELETE CASCADE,
    medicament_id UUID NOT NULL REFERENCES public.medicaments(id) ON DELETE CASCADE,
    quantite NUMERIC(10, 2) NOT NULL DEFAULT 0,
    date_peremption DATE NOT NULL,
    prix_vente NUMERIC(15, 2) NOT NULL,
    lot VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 3. Fournisseurs (Laboratoires ou grossistes)
-- Note: Peut utiliser une table existante si applicable, sinon une spécifique.
CREATE TABLE IF NOT EXISTS public.fournisseurs_labo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gie_id UUID NOT NULL REFERENCES public.gies(id) ON DELETE CASCADE,
    nom VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255),
    contact_telephone VARCHAR(50),
    adresse TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 4. Commandes Fournisseur
CREATE TABLE IF NOT EXISTS public.commandes_labo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gie_id UUID NOT NULL REFERENCES public.gies(id) ON DELETE CASCADE,
    fournisseur_id UUID NOT NULL REFERENCES public.fournisseurs_labo(id) ON DELETE CASCADE,
    statut VARCHAR(50) NOT NULL DEFAULT 'brouillon', -- brouillon, envoyee, reçue_partielle, complete
    date_commande TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    date_reception TIMESTAMP WITH TIME ZONE
);

-- 5. Lignes de Commande
CREATE TABLE IF NOT EXISTS public.lignes_commande_labo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    commande_id UUID NOT NULL REFERENCES public.commandes_labo(id) ON DELETE CASCADE,
    medicament_id UUID NOT NULL REFERENCES public.medicaments(id) ON DELETE CASCADE,
    quantite_commandee NUMERIC(10, 2) NOT NULL,
    quantite_recue NUMERIC(10, 2) DEFAULT 0,
    prix_achat_unitaire NUMERIC(15, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 6. Ventes (POS Pharmacie)
CREATE TABLE IF NOT EXISTS public.ventes_pharmacie (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gie_id UUID NOT NULL REFERENCES public.gies(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients_externes(id) ON DELETE SET NULL, -- optionnel
    montant_total NUMERIC(15, 2) NOT NULL,
    moyen_paiement VARCHAR(50) NOT NULL, -- especes, carte, mobile_money
    date_vente TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    vendeur_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 7. Lignes de Vente
CREATE TABLE IF NOT EXISTS public.lignes_vente_pharmacie (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vente_id UUID NOT NULL REFERENCES public.ventes_pharmacie(id) ON DELETE CASCADE,
    medicament_id UUID NOT NULL REFERENCES public.medicaments(id) ON DELETE CASCADE,
    quantite NUMERIC(10, 2) NOT NULL,
    prix_unitaire NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Index pour optimiser les recherches, notamment les scans de codes-barres
CREATE INDEX idx_medicaments_code_barres ON public.medicaments(code_barres);
CREATE INDEX idx_stocks_pharmacie_gie ON public.stocks_pharmacie(gie_id);
CREATE INDEX idx_stocks_pharmacie_date_peremption ON public.stocks_pharmacie(date_peremption);

-- RLS (Row Level Security) - Protection des données par GIE (Pharmacie)
ALTER TABLE public.stocks_pharmacie ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commandes_labo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventes_pharmacie ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pharmacie access their own stocks" ON public.stocks_pharmacie
    FOR ALL USING (gie_id IN (
        SELECT gie_id FROM public.utilisateurs WHERE id = auth.uid()
    ));

CREATE POLICY "Pharmacie access their own sales" ON public.ventes_pharmacie
    FOR ALL USING (gie_id IN (
        SELECT gie_id FROM public.utilisateurs WHERE id = auth.uid()
    ));

CREATE POLICY "Pharmacie access their own orders" ON public.commandes_labo
    FOR ALL USING (gie_id IN (
        SELECT gie_id FROM public.utilisateurs WHERE id = auth.uid()
    ));
