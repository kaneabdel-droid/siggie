-- Migration 52: Permettre aux administrateurs de GIE de voir tous les utilisateurs de leur GIE
-- Corrige la policy de base de 00_schema.sql (qui ne permettait de voir que auth.uid() = id)

CREATE POLICY "Les administrateurs voient les collaborateurs de leur GIE"
ON public.utilisateurs FOR SELECT
USING (
  gie_id IN (
    SELECT gie_id FROM public.utilisateurs WHERE id = auth.uid() AND role = 'admin'
  )
);
