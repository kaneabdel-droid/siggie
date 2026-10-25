-- Migration 56: Rattachement des prestations matériel à un Membre du GIE ou un Client externe
-- Permet l'intégration automatique du montant facturé dans le Relevé Membre ou le Relevé Client
-- et l'édition de factures de prestation matériel.

ALTER TABLE public.materiel_prestations
  ADD COLUMN IF NOT EXISTS tiers_type varchar(20) DEFAULT 'client' CHECK (tiers_type IN ('membre', 'client')),
  ADD COLUMN IF NOT EXISTS membre_id uuid REFERENCES public.membres(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients_externes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_materiel_prestations_membre_id ON public.materiel_prestations (membre_id);
CREATE INDEX IF NOT EXISTS idx_materiel_prestations_client_id ON public.materiel_prestations (client_id);

COMMENT ON COLUMN public.materiel_prestations.tiers_type IS 'Type de bénéficiaire : membre (Membre du GIE) ou client (Client externe)';
COMMENT ON COLUMN public.materiel_prestations.membre_id IS 'Référence vers le membre du GIE si tiers_type = membre';
COMMENT ON COLUMN public.materiel_prestations.client_id IS 'Référence vers le client externe si tiers_type = client';
