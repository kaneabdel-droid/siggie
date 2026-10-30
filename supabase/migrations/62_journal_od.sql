-- Migration 62: Journal des Opérations Diverses (OD) pour frais généraux et autres produits
CREATE TABLE IF NOT EXISTS public.journal_od (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gie_id UUID NOT NULL REFERENCES public.gies(id) ON DELETE CASCADE,
  date_operation DATE NOT NULL DEFAULT CURRENT_DATE,
  tiers VARCHAR(200),
  reference_piece VARCHAR(100),
  montant NUMERIC NOT NULL CHECK (montant > 0),
  libelle TEXT NOT NULL,
  type_operation VARCHAR(20) NOT NULL DEFAULT 'charge' CHECK (type_operation IN ('charge', 'produit')),
  imputation_id UUID REFERENCES public.imputations(id) ON DELETE SET NULL,
  imputation_libelle VARCHAR(200),
  compte_id UUID REFERENCES public.comptes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.journal_od ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateurs accèdent au journal OD de leur GIE"
ON public.journal_od FOR ALL
USING (gie_id IN (SELECT gie_id FROM public.utilisateurs WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_journal_od_gie_id ON public.journal_od(gie_id);
CREATE INDEX IF NOT EXISTS idx_journal_od_date ON public.journal_od(date_operation);
