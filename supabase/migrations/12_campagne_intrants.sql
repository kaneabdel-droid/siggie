-- Migration 12: Ajout de la configuration des intrants par campagne

-- Table de liaison entre les campagnes et les intrants (pour définir les prix de facturation)
CREATE TABLE public.campagne_intrants (
    id uuid default uuid_generate_v4() primary key,
    gie_id uuid references public.gies(id) on delete cascade not null,
    campagne_id uuid references public.campagnes(id) on delete cascade not null,
    intrant_id uuid references public.intrants(id) on delete cascade not null,
    prix_facturation numeric default 0 not null,
    created_at timestamp with time zone default now(),
    UNIQUE(campagne_id, intrant_id)
);

-- Active RLS sur la nouvelle table
ALTER TABLE public.campagne_intrants ENABLE ROW LEVEL SECURITY;

-- Création des Policies (Filtrage par GIE)
CREATE POLICY "Acces Campagne Intrants par GIE" 
ON public.campagne_intrants FOR ALL USING (gie_id IN (SELECT gie_id FROM public.utilisateurs WHERE id = auth.uid()));
