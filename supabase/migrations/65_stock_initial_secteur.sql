-- Migration 65: Ajout du secteur d'appartenance sur le stock initial (nature)
ALTER TABLE public.stock_nature_initial
  ADD COLUMN IF NOT EXISTS secteur VARCHAR(50) NOT NULL DEFAULT 'exploitation';

ALTER TABLE public.campagnes
  ADD COLUMN IF NOT EXISTS stock_initial_secteur VARCHAR(50) DEFAULT 'exploitation';

