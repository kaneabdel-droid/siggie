ALTER TABLE paiement_moyens DROP CONSTRAINT IF EXISTS paiement_moyens_moyen_check;
ALTER TABLE paiement_moyens ADD CONSTRAINT paiement_moyens_moyen_check CHECK (moyen IN ('carte', 'virement', 'wave', 'orange', 'chariow', 'maketou'));
