-- Migration 58: Modes de paiement étendus pour les clients non-membres (espèces, chèque, bon, nature, autre),
-- compte de destination de trésorerie, suivi du montant payé sur prestations/ventes et entrée en stock nature.

-- 1. Colonnes de suivi de paiement sur materiel_prestations et sorties_stock_nature
ALTER TABLE public.materiel_prestations
  ADD COLUMN IF NOT EXISTS montant_paye numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS statut_paiement varchar(50) DEFAULT 'impayee';

ALTER TABLE public.sorties_stock_nature
  ADD COLUMN IF NOT EXISTS montant_paye numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS statut_paiement varchar(50) DEFAULT 'impayee';

-- 2. Enrichissement de paiements_clients pour supporter tous les modes de règlement et le stock en nature
ALTER TABLE public.paiements_clients
  ADD COLUMN IF NOT EXISTS mode_paiement varchar(50) DEFAULT 'espece', -- 'espece', 'cheque', 'bon', 'nature', 'autre'
  ADD COLUMN IF NOT EXISTS compte_id uuid REFERENCES public.comptes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reference_piece varchar(150),
  ADD COLUMN IF NOT EXISTS quantite_nature numeric,
  ADD COLUMN IF NOT EXISTS produit_nature text,
  ADD COLUMN IF NOT EXISTS prix_unitaire_nature numeric,
  ADD COLUMN IF NOT EXISTS variete text,
  ADD COLUMN IF NOT EXISTS origine_stock text DEFAULT 'materiel',
  ADD COLUMN IF NOT EXISTS campagne_id uuid REFERENCES public.campagnes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS document_id text,
  ADD COLUMN IF NOT EXISTS document_type text;

-- 3. Assouplissement sur remboursements pour les règlements clients sans facture de campagne ni membre
ALTER TABLE public.remboursements
  ALTER COLUMN facture_id DROP NOT NULL,
  ALTER COLUMN membre_id DROP NOT NULL;

