// Valeurs canoniques stockées en base (contrainte check sur materiels.type_materiel) —
// toujours en français quelle que soit la langue de l'interface, comme les noms de
// forfaits (Standard/Medium/Premium). L'affichage traduit passe par
// dict.materiel_extra.type_labels.
export const MATERIEL_TYPES = [
  'Bâtiment et installations',
  'Matériel agricole',
  'Matériel et mobilier',
  'Matériel informatique',
  'Matériel de transport',
] as const
