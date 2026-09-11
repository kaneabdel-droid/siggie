-- Taux d'intérêt et durée du crédit bancaire (GIE), pour calculer le montant
-- d'intérêt à répartir entre les membres : montant_accorde * (taux_interet/100)
-- * (duree_credit/12). Stocké séparément du principal facturé (factures.montant_total)
-- pour rester auditable et ne jamais être écrasé par une régénération des factures.
alter table public.credits
  add column if not exists taux_interet numeric default 0,
  add column if not exists duree_credit integer default 0;

alter table public.factures
  add column if not exists montant_interet numeric default 0;
