-- Migration 54: Extension des remboursements (Bons, Chèques et Références de pièces)

ALTER TABLE public.remboursements ADD COLUMN IF NOT EXISTS reference_piece varchar(100);
ALTER TABLE public.remboursements ADD COLUMN IF NOT EXISTS compte_id uuid references public.comptes(id) on delete set null;

COMMENT ON COLUMN public.remboursements.reference_piece IS 'Numéro de chèque, référence de bon ou pièce justificative';
COMMENT ON COLUMN public.remboursements.compte_id IS 'Compte de trésorerie crédité pour le règlement';
