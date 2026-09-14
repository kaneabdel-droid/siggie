-- Index de performance : chaque policy RLS filtre sur "gie_id in (select
-- gie_id from utilisateurs where id = auth.uid())", et la plupart des pages
-- filtrent en plus sur une clé étrangère (campagne_id, membre_id,
-- materiel_id, facture_id, client_id...). Sans index, ces filtres dégénèrent
-- en scans séquentiels qui se dégradent à mesure que les tables grossissent.
-- Toutes ces tables sont déjà en RLS ; cette migration n'ajoute que des index,
-- aucune donnée ni policy n'est modifiée.

create index if not exists idx_utilisateurs_gie_id on public.utilisateurs (gie_id);
create index if not exists idx_membres_gie_id on public.membres (gie_id);
create index if not exists idx_campagnes_gie_id on public.campagnes (gie_id);

create index if not exists idx_intrants_gie_id on public.intrants (gie_id);
create index if not exists idx_intrants_campagne_id on public.intrants (campagne_id);

create index if not exists idx_distribution_intrants_gie_id on public.distribution_intrants (gie_id);
create index if not exists idx_distribution_intrants_campagne_id on public.distribution_intrants (campagne_id);
create index if not exists idx_distribution_intrants_membre_id on public.distribution_intrants (membre_id);
create index if not exists idx_distribution_intrants_intrant_id on public.distribution_intrants (intrant_id);

create index if not exists idx_credits_gie_id on public.credits (gie_id);
create index if not exists idx_credits_campagne_id on public.credits (campagne_id);
create index if not exists idx_credits_membre_id on public.credits (membre_id);

create index if not exists idx_factures_gie_id on public.factures (gie_id);
create index if not exists idx_factures_campagne_id on public.factures (campagne_id);
create index if not exists idx_factures_membre_id on public.factures (membre_id);

create index if not exists idx_transactions_gie_id on public.transactions (gie_id);

create index if not exists idx_materiels_gie_id on public.materiels (gie_id);

create index if not exists idx_campagne_membres_gie_id on public.campagne_membres (gie_id);

create index if not exists idx_comptes_gie_id on public.comptes (gie_id);

create index if not exists idx_materiel_prestations_gie_id on public.materiel_prestations (gie_id);
create index if not exists idx_materiel_prestations_campagne_id on public.materiel_prestations (campagne_id);
create index if not exists idx_materiel_prestations_materiel_id on public.materiel_prestations (materiel_id);

create index if not exists idx_materiel_consommations_gie_id on public.materiel_consommations (gie_id);
create index if not exists idx_materiel_consommations_campagne_id on public.materiel_consommations (campagne_id);
create index if not exists idx_materiel_consommations_materiel_id on public.materiel_consommations (materiel_id);

create index if not exists idx_remboursements_gie_id on public.remboursements (gie_id);
create index if not exists idx_remboursements_facture_id on public.remboursements (facture_id);
create index if not exists idx_remboursements_membre_id on public.remboursements (membre_id);

create index if not exists idx_campagne_intrants_gie_id on public.campagne_intrants (gie_id);

create index if not exists idx_achats_intrants_gie_id on public.achats_intrants (gie_id);
create index if not exists idx_achats_intrants_intrant_id on public.achats_intrants (intrant_id);

create index if not exists idx_imputations_gie_id on public.imputations (gie_id);

create index if not exists idx_sorties_stock_nature_gie_id on public.sorties_stock_nature (gie_id);
create index if not exists idx_sorties_stock_nature_campagne_id on public.sorties_stock_nature (campagne_id);
create index if not exists idx_sorties_stock_nature_membre_id on public.sorties_stock_nature (membre_id);

create index if not exists idx_clients_externes_gie_id on public.clients_externes (gie_id);

create index if not exists idx_paiements_clients_gie_id on public.paiements_clients (gie_id);
create index if not exists idx_paiements_clients_client_id on public.paiements_clients (client_id);

create index if not exists idx_budget_previsions_gie_id on public.budget_previsions (gie_id);
