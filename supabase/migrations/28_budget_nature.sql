-- Le suivi budgétaire couvre aussi bien des prévisions de recettes que de
-- dépenses (ex: "Recettes prestations matériel" vs "Carburant matériel").
-- Chaque rubrique porte donc, en plus de sa catégorie de budget (Exploitation
-- / Matériel), une nature Recette / Dépense qui détermine le sens du calcul
-- de réalisation et d'écart dans le suivi budgétaire.
alter table public.imputations
  add column if not exists nature text not null default 'depense'
  check (nature in ('recette', 'depense'));

-- Accès Premium uniquement : le référentiel de rubriques (imputations), la
-- prévision budgétaire et le suivi budgétaire sont réservés au forfait
-- Premium. Rien à ajouter ici côté schéma : l'accès est vérifié côté
-- application (redirection dans tresorerie/imputations, comme pour /bilans).
