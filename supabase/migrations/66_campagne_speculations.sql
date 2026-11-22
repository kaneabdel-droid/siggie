-- Migration 66: Suivi multi-spéculations par campagne (ex: Oignon, Tomate, Riz...)
-- Permet de suivre dans une même campagne plusieurs cultures avec leurs membres, superficies,
-- crédits alloués, facturations, remboursements, poids et prix de collecte, ainsi que le récapitulatif par membre.

-- 1. Table des spéculations d'une campagne
CREATE TABLE IF NOT EXISTS public.campagne_speculations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    gie_id UUID REFERENCES public.gies(id) ON DELETE CASCADE NOT NULL,
    campagne_id UUID REFERENCES public.campagnes(id) ON DELETE CASCADE NOT NULL,
    nom VARCHAR(150) NOT NULL, -- Ex: Oignon, Tomate, Riz paddy, Maïs
    variete VARCHAR(150), -- Ex: Violet de Galmi, Mongal F1, Sahel 108
    produit_collecte VARCHAR(150), -- Ex: Oignon séché en sacs, Tomate fraîche
    prix_collecte NUMERIC DEFAULT 0, -- Prix au kg ou à l'unité convenu pour la collecte
    poids_standard NUMERIC DEFAULT 50, -- Poids standard du sac / cagette (ex: 50 kg pour sac d'oignon)
    unite_mesure VARCHAR(50) DEFAULT 'kg', -- kg, sac, tonne, cagette
    credit_alloue NUMERIC DEFAULT 0, -- Montant du crédit bancaire alloué à cette spéculation
    rendement_prevu_tonne_ha NUMERIC DEFAULT 0, -- Objectif de rendement prévisionnel
    statut VARCHAR(50) DEFAULT 'active', -- active, clôturée
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les recherches par campagne et GIE
CREATE INDEX IF NOT EXISTS idx_campagne_speculations_campagne ON public.campagne_speculations(campagne_id);
CREATE INDEX IF NOT EXISTS idx_campagne_speculations_gie ON public.campagne_speculations(gie_id);

-- RLS
ALTER TABLE public.campagne_speculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acces Campagne Speculations par GIE"
ON public.campagne_speculations FOR ALL USING (
    gie_id IN (SELECT gie_id FROM public.utilisateurs WHERE id = auth.uid())
);

-- 2. Table d'affectation des membres et de leurs superficies par spéculation
CREATE TABLE IF NOT EXISTS public.campagne_membre_speculations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    gie_id UUID REFERENCES public.gies(id) ON DELETE CASCADE NOT NULL,
    campagne_id UUID REFERENCES public.campagnes(id) ON DELETE CASCADE NOT NULL,
    membre_id UUID REFERENCES public.membres(id) ON DELETE CASCADE NOT NULL,
    speculation_id UUID REFERENCES public.campagne_speculations(id) ON DELETE CASCADE NOT NULL,
    superficie NUMERIC DEFAULT 0, -- Superficie emblavée déclarée en hectares
    superficie_validee NUMERIC, -- Superficie validée au tour de casier
    casier VARCHAR(100), -- Parcelle / casier / canal
    statut_validation VARCHAR(50) DEFAULT 'en_attente', -- en_attente, valide, partiel, litige
    credit_attribue NUMERIC DEFAULT 0, -- Part de crédit allouée individuellement pour cette culture
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(campagne_id, membre_id, speculation_id)
);

CREATE INDEX IF NOT EXISTS idx_membre_speculations_campagne ON public.campagne_membre_speculations(campagne_id);
CREATE INDEX IF NOT EXISTS idx_membre_speculations_membre ON public.campagne_membre_speculations(membre_id);
CREATE INDEX IF NOT EXISTS idx_membre_speculations_spec ON public.campagne_membre_speculations(speculation_id);

-- RLS
ALTER TABLE public.campagne_membre_speculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acces Campagne Membre Speculations par GIE"
ON public.campagne_membre_speculations FOR ALL USING (
    gie_id IN (SELECT gie_id FROM public.utilisateurs WHERE id = auth.uid())
);

-- 3. Colonnes optionnelles de rattachement direct aux spéculations
ALTER TABLE public.remboursements
    ADD COLUMN IF NOT EXISTS speculation_id UUID REFERENCES public.campagne_speculations(id) ON DELETE SET NULL;

ALTER TABLE public.distribution_intrants
    ADD COLUMN IF NOT EXISTS speculation_id UUID REFERENCES public.campagne_speculations(id) ON DELETE SET NULL;

