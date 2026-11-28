-- Ajout de la référence pièce justificative sur les dépenses / consommations matériel
alter table public.materiel_consommations
  add column if not exists reference_piece varchar(150);
