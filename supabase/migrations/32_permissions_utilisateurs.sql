-- Permissions fines par utilisateur : { "<module>": ["read","create","update","delete"], ... }
-- NULL = accès complet (comportement historique : tous les comptes existants et le
-- propriétaire du GIE conservent l'accès à tout). Seule la clé de service (espace
-- admin plateforme) écrit cette colonne : la table utilisateurs n'a qu'une policy
-- SELECT, un utilisateur ne peut donc pas modifier ses propres droits.
alter table public.utilisateurs
  add column if not exists permissions jsonb;
