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
  if (!type) return true
  const lower = type.trim().toLowerCase()
  if (NON_STOCKABLE_INTRANT_TYPES.some((t) => t.toLowerCase() === lower)) {
    return false
  }
  if (
    lower.includes('service') ||
    lower.includes('façon') ||
    lower.includes('facon') ||
    lower.includes('refactur') ||
    lower.includes('rebill')
  ) {
    return false
  }
  return true
}

/**
 * Détermine si un intrant est un bien physique stocké ou un service/prestation/refacturation
 * sans stock physique. Les services ne doivent JAMAIS être inclus dans les stocks ou
 * dans le calcul de la variation de stock.
 */
export function isStockableIntrant(intrant: {
  type_intrant?: string | null
  nom?: string | null
}): boolean {
  if (intrant.type_intrant && !isStockableType(intrant.type_intrant)) {
    return false
  }
  const nom = (intrant.nom || '').trim().toLowerCase()
  if (
    nom.includes('hydraulique') ||
    nom.includes('fomaed') ||
    nom.includes('offsetage') ||
    nom.includes('labour') ||
    nom.includes('battage') ||
    nom.includes('repiquage') ||
    nom.includes('faucardage') ||
    nom.includes('avance') ||
    nom.includes('impayé') ||
    nom.includes('impaye') ||
    nom.includes('prestation')
  ) {
    return false
  }
  return true
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

// Ordre d'affichage des colonnes et articles par type d'intrant dans les factures et bilans :
// 1. Façon culturale / cultural (labour, travail du sol, façon, etc.)
// 2. Service Hydraulique (irrigation, eau, etc.)
// 3. Semence (seed, etc.)
// 4. Engrais (fertilizer, etc.)
// 5. Produits phytosanitaires (pesticide, fongicide, herbicide, phytosanitaire, etc.)
// 6. Refacturation (rebilling, etc.)
// 7. Autres
const TYPE_ORDER_KEYWORDS: string[][] = [
  ['façon', 'facon', 'cultural', 'cultivation'],
  ['service hydraulique', 'water service', 'hydraulique', 'irrigation', 'service eau'],
  ['semence', 'seed'],
  ['engrais', 'fertilizer', 'fertiliser'],
  ['pesticide', 'fongicide', 'fungicide', 'herbicide', 'phytosanitaire', 'phytosannitaire', 'phyto', 'insecticide'],
  ['refacturation', 'rebilling', 'refactur'],
]

export function getTypeOrderRank(type: string | null | undefined): number {
  const normalized = (type || '').trim().toLowerCase()
  const index = TYPE_ORDER_KEYWORDS.findIndex((keywords) =>
    keywords.some((keyword) => normalized.includes(keyword))
  )
  return index === -1 ? TYPE_ORDER_KEYWORDS.length : index
}

/**
 * Rang de tri croissant d'un article ou intrant selon l'ordre strict :
 * 0: façon cultural
 * 1: service hydraulique
 * 2: semences
 * 3: engrais
 * 4: produits phytosannitaires
 * 5: refacturation
 * 6: autres
 * Si le type est manquant ou générique, vérifie aussi le nom de l'intrant en repli.
 */
export function getFactureItemRank(type: string | null | undefined, nom?: string | null | undefined): number {
  const rank = getTypeOrderRank(type)
  if (rank < TYPE_ORDER_KEYWORDS.length) return rank
  if (nom) {
    const rankFromName = getTypeOrderRank(nom)
    if (rankFromName < TYPE_ORDER_KEYWORDS.length) return rankFromName
  }
  return TYPE_ORDER_KEYWORDS.length
}
