-- Script 3: Refactoring des Crédits pour le GIE (et non plus par membre)

-- 1. On retire la colonne membre_id de la table credits
ALTER TABLE public.credits DROP COLUMN IF EXISTS membre_id;

-- 2. On ajoute les nouvelles colonnes nécessaires à la gestion globale par le GIE
ALTER TABLE public.credits 
  ADD COLUMN IF EXISTS banque_nom varchar(150),
  ADD COLUMN IF EXISTS montant_accorde numeric default 0;

-- 3. On ajoute une clé étrangère sur la table des transactions 
--    pour pouvoir lier les dépenses/achats au crédit utilisé.
ALTER TABLE public.transactions 
  ADD COLUMN IF EXISTS credit_id uuid references public.credits(id) on delete set null;

-- (Optionnel) Si on veut s'assurer que le statut "valide" (ou "accorde") existe, c'est déjà un varchar(50) donc flexible.
