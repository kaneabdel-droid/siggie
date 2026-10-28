-- 57_clients_code_and_stock_origin.sql

-- 1. Code client pour les clients externes
alter table public.clients_externes
  add column if not exists code_client text;

-- 2. Origine et variété du stock dans les remboursements en nature
-- Permettre aussi d'enregistrer des remboursements/paiements provenant de clients externes
alter table public.remboursements
  alter column facture_id drop not null,
  alter column membre_id drop not null,
  add column if not exists client_id uuid references public.clients_externes(id) on delete set null,
  add column if not exists origine_stock text default 'exploitation', -- 'exploitation', 'materiel', 'achat'
  add column if not exists variete text, -- ex: 'Sahel 108', 'BG 90-2'
  add column if not exists document_id text,
  add column if not exists document_type text; -- 'campagne', 'prestation', 'vente_stock'

-- 3. Date de transaction et tiers dans les transactions de trésorerie
alter table public.transactions
  add column if not exists date_transaction date default current_date,
  add column if not exists tiers_type text, -- 'client', 'fournisseur', 'membre', 'compte_transfert', 'autre'
  add column if not exists tiers_nom text,
  add column if not exists materiel_id uuid references public.materiels(id) on delete set null;
