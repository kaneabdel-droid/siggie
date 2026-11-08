-- Migration 63: Soldes initiaux (clients externes, campagnes stock nature) et unités de vente/contenance
-- 1. Solde initial pour les clients externes
ALTER TABLE public.clients_externes
  ADD COLUMN IF NOT EXISTS solde_initial NUMERIC DEFAULT 0;

-- 2. Stock initial / inventaire d'ouverture pour les campagnes (stock en nature)
ALTER TABLE public.campagnes
  ADD COLUMN IF NOT EXISTS stock_initial_quantite NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_initial_unite VARCHAR(50) DEFAULT 'kg',
  ADD COLUMN IF NOT EXISTS stock_initial_valeur NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_initial_date DATE;

-- 3. Détails d'unités de vente et de contenance sur sorties_stock_nature
ALTER TABLE public.sorties_stock_nature
  ADD COLUMN IF NOT EXISTS unite VARCHAR(50) DEFAULT 'kg',
  ADD COLUMN IF NOT EXISTS nb_contenance NUMERIC,
  ADD COLUMN IF NOT EXISTS quantite_vente NUMERIC,
  ADD COLUMN IF NOT EXISTS unite_vente VARCHAR(50);

