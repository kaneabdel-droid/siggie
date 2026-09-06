-- Verrouillage manuel d'un GIE par l'admin plateforme, indépendant de l'essai gratuit.
alter table public.gies add column compte_verrouille boolean not null default false;

-- Ajout du prestataire Chariow aux contraintes existantes.
alter table public.abonnement_paiements drop constraint abonnement_paiements_provider_check;
alter table public.abonnement_paiements add constraint abonnement_paiements_provider_check
    check (provider in ('bictorys', 'moneroo', 'virement', 'chariow'));

alter table public.abonnement_paiements drop constraint abonnement_paiements_moyen_paiement_check;
alter table public.abonnement_paiements add constraint abonnement_paiements_moyen_paiement_check
    check (moyen_paiement in ('wave', 'orange', 'carte', 'virement', 'chariow'));

-- Mapping montant -> produit Chariow (Chariow ne facture que le prix d'un produit
-- préconfiguré dans sa boutique, jamais un montant libre par API). Géré depuis
-- /admin/config, jamais par les utilisateurs finaux.
create table public.chariow_produits (
    montant numeric primary key,
    product_id text not null,
    updated_at timestamp with time zone default now()
);

alter table public.chariow_produits enable row level security;
-- Aucune policy : accessible uniquement via le client admin (service role, hors RLS).
