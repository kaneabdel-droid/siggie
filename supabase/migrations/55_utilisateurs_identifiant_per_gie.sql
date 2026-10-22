-- Migration 55: Rendre l'identifiant collaborateur unique par GIE plutôt que globalement
ALTER TABLE public.utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_identifiant_key;
ALTER TABLE public.utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_identifiant_unique;
ALTER TABLE public.utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_gie_identifiant_key;
ALTER TABLE public.utilisateurs ADD CONSTRAINT utilisateurs_gie_identifiant_key UNIQUE (gie_id, identifiant);
