-- Ajout du détail du produit pour les remboursements en nature
ALTER TABLE public.remboursements ADD COLUMN IF NOT EXISTS produit_nature varchar(150);
