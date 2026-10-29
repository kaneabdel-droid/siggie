-- Migration 59: Réinitialisation des soldes initiaux des comptes de trésorerie à 0 au 1er janvier 2026
-- et ajout de la date_solde_initial par défaut

ALTER TABLE public.comptes
  ADD COLUMN IF NOT EXISTS date_solde_initial date DEFAULT '2026-01-01';

UPDATE public.comptes
SET solde_initial = 0,
    date_solde_initial = '2026-01-01';
