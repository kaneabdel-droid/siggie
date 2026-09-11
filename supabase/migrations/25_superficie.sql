-- Superficie (hectares) exploitée par un membre : sert de valeur par défaut pour
-- la superficie déclarée à son inscription à une campagne (campagne_membres),
-- elle-même utilisée comme quantité par défaut lors de la distribution des
-- intrants facturés à l'hectare (Façon culturale, Service Hydraulique).
alter table public.membres
  add column if not exists superficie numeric default 0;

alter table public.campagne_membres
  add column if not exists superficie numeric default 0;
