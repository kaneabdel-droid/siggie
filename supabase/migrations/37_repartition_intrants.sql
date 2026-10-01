-- Répartition des intrants d'une campagne au prorata des superficies.
--
-- quantite_prevue : quantité totale de l'intrant à répartir entre les membres
-- inscrits à la campagne. La part de chaque membre vaut
--   quantite_prevue × superficie du membre / superficie totale des inscrits
-- (superficies de campagne_membres). Elle n'est pas stockée : elle est
-- recalculée à l'affichage (page Répartition) et sert de valeur par défaut
-- lors de la distribution, pour suivre automatiquement toute modification de
-- superficie ou d'inscription.
alter table public.campagne_intrants
  add column if not exists quantite_prevue numeric not null default 0;
