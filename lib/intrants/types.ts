// Certains types d'intrants ne représentent pas un bien physique stocké :
// "Refacturation" (frais forfaitaires refacturés aux membres) et
// "Service Hydraulique" (consommation d'eau) n'ont jamais de quantité en
// stock à suivre. "Refacturation" est en plus un montant forfaitaire : sa
// distribution demande un montant (FCFA) plutôt qu'une quantité physique.
// type_intrant est un champ texte libre (avec suggestions par langue) : les
// deux variantes fr/en sont listées ici pour que la détection fonctionne
// quelle que soit la langue dans laquelle l'intrant a été créé.
export const NON_STOCKABLE_INTRANT_TYPES = ['Refacturation', 'Rebilling', 'Service Hydraulique', 'Water Service']
export const FORFAITAIRE_INTRANT_TYPES = ['Refacturation', 'Rebilling']

export function isStockableType(type: string | null | undefined): boolean {
  return !NON_STOCKABLE_INTRANT_TYPES.includes(type || '')
}

export function isForfaitaireType(type: string | null | undefined): boolean {
  return FORFAITAIRE_INTRANT_TYPES.includes(type || '')
}
