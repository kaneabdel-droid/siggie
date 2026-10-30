-- Migration 60: Justificatif du solde initial du membre (PDF, PNG, CSV)
ALTER TABLE public.membres
  ADD COLUMN IF NOT EXISTS justificatif_solde_initial text,
  ADD COLUMN IF NOT EXISTS justificatif_nom text;
