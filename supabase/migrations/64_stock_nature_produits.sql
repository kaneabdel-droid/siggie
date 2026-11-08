-- Migration 64: Gestion multi-produits du stock en nature et fiabilisation du stock initial
-- 1. Assurer la présence des colonnes stock_initial sur campagnes
ALTER TABLE public.campagnes
  ADD COLUMN IF NOT EXISTS stock_initial_quantite NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_initial_unite VARCHAR(50) DEFAULT 'kg',
  ADD COLUMN IF NOT EXISTS stock_initial_valeur NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_initial_date DATE;

-- 2. Assurer les colonnes d'unités et contenances sur sorties_stock_nature
ALTER TABLE public.sorties_stock_nature
  ADD COLUMN IF NOT EXISTS unite VARCHAR(50) DEFAULT 'kg',
  ADD COLUMN IF NOT EXISTS nb_contenance NUMERIC,
  ADD COLUMN IF NOT EXISTS quantite_vente NUMERIC,
  ADD COLUMN IF NOT EXISTS unite_vente VARCHAR(50);

-- 3. Table dédiée pour le stock initial par produit (permet plusieurs produits par campagne)
CREATE TABLE IF NOT EXISTS public.stock_nature_initial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gie_id UUID NOT NULL REFERENCES public.gies(id) ON DELETE CASCADE,
  campagne_id UUID NOT NULL REFERENCES public.campagnes(id) ON DELETE CASCADE,
  produit VARCHAR(100) NOT NULL,
  quantite NUMERIC NOT NULL DEFAULT 0,
  unite VARCHAR(50) NOT NULL DEFAULT 'kg',
  valeur_unitaire NUMERIC NOT NULL DEFAULT 0,
  date_inventaire DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(gie_id, campagne_id, produit)
);

ALTER TABLE public.stock_nature_initial ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acces Stock Nature Initial par GIE"
ON public.stock_nature_initial FOR ALL
USING (gie_id IN (SELECT gie_id FROM public.utilisateurs WHERE id = auth.uid()));

-- 4. Assouplissement de la table remboursements pour autoriser les écritures de régularisation sans membre/facture
ALTER TABLE public.remboursements
  ALTER COLUMN facture_id DROP NOT NULL,
  ALTER COLUMN membre_id DROP NOT NULL;
