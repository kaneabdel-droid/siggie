-- Migration 05: Add code_membre to membres table

ALTER TABLE public.membres
ADD COLUMN code_membre varchar(50);

-- Make it unique per GIE
ALTER TABLE public.membres 
ADD CONSTRAINT unique_code_membre_per_gie UNIQUE (gie_id, code_membre);
