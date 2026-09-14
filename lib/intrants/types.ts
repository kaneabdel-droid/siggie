// Certains types d'intrants ne représentent pas un bien physique stocké :
// "Refacturation" (frais forfaitaires refacturés aux membres) et
// "Service Hydraulique" (consommation d'eau) n'ont jamais de quantité en
// stock à suivre. "Refacturation" est en plus un montant forfaitaire : sa
// distribution demande un montant (FCFA) plutôt qu'une quantité physique.
// type_intrant est un champ texte libre (avec suggestions par langue) : les
// deux variantes fr/en sont listées ici pour que la détection fonctionne
// quelle que soit la langue dans laquelle l'intrant a été créé.
// "Façon culturale" et "Service Hydraulique" n'ont pas de stock mais restent
// facturés à la quantité (heures, m³...) ; seule "Refacturation" est un
// montant forfaitaire (la "quantité" saisie est directement le montant FCFA).
export const NON_STOCKABLE_INTRANT_TYPES = [
  'Refacturation', 'Rebilling',
  'Service Hydraulique', 'Water Service',
  'Façon culturale', 'Cultivation Work',
]
export const FORFAITAIRE_INTRANT_TYPES = ['Refacturation', 'Rebilling']

export function isStockableType(type: string | null | undefined): boolean {
  return !NON_STOCKABLE_INTRANT_TYPES.includes(type || '')
}

export function isForfaitaireType(type: string | null | undefined): boolean {
  return FORFAITAIRE_INTRANT_TYPES.includes(type || '')
}

// Façon culturale et Service Hydraulique sont facturés à l'hectare : la quantité à
// distribuer par membre correspond par défaut à la superficie qu'il exploite pour
// la campagne (voir campagne_membres.superficie), plutôt que de partir d'une saisie vide.
export const SUPERFICIE_BASED_INTRANT_TYPES = [
  'Façon culturale', 'Cultivation Work',
  'Service Hydraulique', 'Water Service',
]

export function isSuperficieBasedType(type: string | null | undefined): boolean {
  return SUPERFICIE_BASED_INTRANT_TYPES.includes(type || '')
}

// Ordre d'affichage des colonnes par type d'intrant dans l'état des remboursements
// membre (bilan de campagne) : Façon culturale, Service Hydraulique, Semence, Engrais,
// Produits phytosanitaires (Pesticide/Fongicide/Herbicide), Refacturation, puis Autres.
// type_intrant étant un champ texte libre, les GIE n'utilisent pas toujours la casse ou
// le libellé exact suggéré (ex: "engrais" en minuscule, ou "Produits phytosanitaires"
// saisi tel quel plutôt que "Pesticide"/"Herbicide") : le classement se fait donc par
// mot-clé, insensible à la casse, plutôt que par égalité stricte.
const TYPE_ORDER_KEYWORDS: string[][] = [
  ['façon culturale', 'cultivation work'],
  ['service hydraulique', 'water service', 'hydraulique'],
  ['semence', 'seed'],
  ['engrais', 'fertilizer', 'fertiliser'],
  ['pesticide', 'fongicide', 'fungicide', 'herbicide', 'phytosanitaire'],
  ['refacturation', 'rebilling'],
]

export function getTypeOrderRank(type: string | null | undefined): number {
  const normalized = (type || '').trim().toLowerCase()
  const index = TYPE_ORDER_KEYWORDS.findIndex((keywords) =>
    keywords.some((keyword) => normalized.includes(keyword))
  )
  return index === -1 ? TYPE_ORDER_KEYWORDS.length : index
}
