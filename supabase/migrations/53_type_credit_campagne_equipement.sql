-- Migration 53: Distinction Crédit Campagne (Trésorerie / Court terme) vs Crédit Équipement (Investissement / Moyen terme)
-- Permet de différencier les financements d'exploitation de court terme (intrants, labour, carburant)
-- des financements d'investissement de moyen terme (tracteurs, moissonneuses, motopompes, hangars).

ALTER TABLE public.credits
  ADD COLUMN IF NOT EXISTS type_credit varchar(50) DEFAULT 'campagne',
  ADD COLUMN IF NOT EXISTS equipement_nom varchar(200),
  ADD COLUMN IF NOT EXISTS periodicite_remboursement varchar(50) DEFAULT 'annuelle',
  ADD COLUMN IF NOT EXISTS nombre_echeances integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS montant_echeance numeric DEFAULT 0;

-- La campagne agricole devient optionnelle pour les crédits d'équipement (car ils courent sur plusieurs campagnes)
ALTER TABLE public.credits ALTER COLUMN campagne_id DROP NOT NULL;

-- Index pour optimiser le filtrage par type de crédit et GIE
CREATE INDEX IF NOT EXISTS idx_credits_type_credit ON public.credits(type_credit);
CREATE INDEX IF NOT EXISTS idx_credits_gie_type ON public.credits(gie_id, type_credit);
