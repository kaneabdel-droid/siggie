CREATE TABLE IF NOT EXISTS public.maketou_produits (
    montant integer PRIMARY KEY,
    product_id text NOT NULL
);
ALTER TABLE public.maketou_produits ENABLE ROW LEVEL SECURITY;
