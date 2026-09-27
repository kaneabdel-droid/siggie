-- Anti double paiement d'abonnement.
--
-- 1. checkout_url : la page de paiement du prestataire est mémorisée pour être
--    renvoyée telle quelle si le client relance le même paiement (double clic,
--    second onglet, retour arrière) au lieu d'ouvrir une seconde transaction.
-- 2. abandonne_le : un paiement en attente remplacé par une nouvelle tentative
--    reste 'pending' (s'il est finalement payé, l'argent n'est pas perdu : il est
--    traité, et marqué doublon si l'offre était déjà réglée) mais ne compte plus
--    comme « le » paiement en cours du GIE.
-- 3. doublon : paiement encaissé pour une offre déjà réglée. Il ne modifie pas
--    l'abonnement, est exclu des statistiques de vente et signalé à rembourser.
alter table public.abonnement_paiements
  add column if not exists checkout_url text,
  add column if not exists abandonne_le timestamptz,
  add column if not exists doublon boolean not null default false;

-- Existant : ne garder que la tentative en attente la plus récente de chaque GIE,
-- sinon l'index unique ci-dessous ne pourrait pas être créé.
update public.abonnement_paiements p
set abandonne_le = now()
where p.statut = 'pending'
  and p.abandonne_le is null
  and exists (
    select 1 from public.abonnement_paiements r
    where r.gie_id = p.gie_id
      and r.statut = 'pending'
      and r.abandonne_le is null
      and (r.created_at, r.id) > (p.created_at, p.id)
  );

-- Un seul paiement en cours par GIE : protège contre deux requêtes simultanées
-- (double clic, deux onglets) que le contrôle applicatif ne suffit pas à exclure.
create unique index if not exists abonnement_paiements_un_en_cours_par_gie
  on public.abonnement_paiements (gie_id)
  where statut = 'pending' and abandonne_le is null;
