-- Script 7: Ajout d'informations d'amortissement et d'acquisition pour le matériel

ALTER TABLE public.materiels 
  ADD COLUMN IF NOT EXISTS valeur_acquisition numeric default 0,
  ADD COLUMN IF NOT EXISTS duree_vie_economique integer default 0, -- en années
  ADD COLUMN IF NOT EXISTS fournisseur varchar(150);
