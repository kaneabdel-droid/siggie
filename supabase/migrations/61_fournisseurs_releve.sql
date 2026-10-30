-- Migration 61: Suivi Fournisseurs & Grand Livre Fournisseur
CREATE TABLE IF NOT EXISTS public.fournisseurs_externes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gie_id UUID NOT NULL REFERENCES public.gies(id) ON DELETE CASCADE,
  nom VARCHAR(200) NOT NULL,
  telephone VARCHAR(100),
  adresse TEXT,
  code_fournisseur VARCHAR(50),
  solde_initial NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.fournisseurs_externes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateurs accèdent aux fournisseurs de leur GIE"
ON public.fournisseurs_externes FOR ALL
USING (gie_id IN (SELECT gie_id FROM public.utilisateurs WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_fournisseurs_externes_gie_id ON public.fournisseurs_externes(gie_id);
