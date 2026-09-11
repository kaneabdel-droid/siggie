-- Catégorisation du parc matériel (page Inventaire) : liste fermée de catégories
-- comptables standard pour un GIE.
alter table public.materiels
  add column if not exists type_materiel varchar(50) not null default 'Matériel agricole'
  check (type_materiel in (
    'Bâtiment et installations',
    'Matériel agricole',
    'Matériel et mobilier',
    'Matériel informatique',
    'Matériel de transport'
  ));
