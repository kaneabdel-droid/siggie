export type CreditType = 'campagne' | 'equipement'

export type PeriodiciteRemboursement = 'annuelle' | 'semestrielle' | 'trimestrielle' | 'mensuelle'

/**
 * Détermine si le crédit est un Crédit de Campagne (Trésorerie / Court terme)
 * ou un Crédit d'Équipement (Investissement / Moyen terme).
 * Rétrocompatible même si la colonne type_credit n'est pas encore migrée.
 */
export function getCreditType(credit: {
  type_credit?: string | null
  but_credit?: string | null
}): CreditType {
  if (credit.type_credit === 'equipement' || credit.type_credit === 'campagne') {
    return credit.type_credit as CreditType
  }
  if (credit.but_credit && credit.but_credit.includes('[TYPE:equipement]')) {
    return 'equipement'
  }
  return 'campagne'
}

/**
 * Récupère le nom de l'équipement ou matériel financé
 */
export function getCreditEquipementNom(credit: {
  equipement_nom?: string | null
  but_credit?: string | null
}): string | null {
  if (credit.equipement_nom) return credit.equipement_nom
  if (credit.but_credit) {
    const match = credit.but_credit.match(/\[EQUIPEMENT:([^\]]+)\]/)
    if (match && match[1] && match[1].trim()) return match[1].trim()
  }
  return null
}

/**
 * Récupère la périodicité de remboursement
 */
export function getCreditPeriodicite(credit: {
  periodicite_remboursement?: string | null
  but_credit?: string | null
}): PeriodiciteRemboursement {
  if (credit.periodicite_remboursement) {
    return credit.periodicite_remboursement as PeriodiciteRemboursement
  }
  if (credit.but_credit) {
    const match = credit.but_credit.match(/\[PERIODICITE:([^\]]+)\]/)
    if (match && match[1]) return match[1].trim() as PeriodiciteRemboursement
  }
  return 'annuelle'
}

/**
 * Nettoie le motif du crédit des méta-tags pour l'affichage utilisateur
 */
export function cleanButCredit(butCredit: string | null | undefined): string {
  if (!butCredit) return ''
  return butCredit
    .replace(/\[TYPE:[^\]]+\]/g, '')
    .replace(/\[EQUIPEMENT:[^\]]*\]/g, '')
    .replace(/\[PERIODICITE:[^\]]*\]/g, '')
    .replace(/\[ECHEANCE:[^\]]*\]/g, '')
    .trim()
}

/**
 * Calcule l'échéance théorique constante pour un crédit d'équipement moyen terme
 */
export function calculerEcheanceEstimee(
  capital: number,
  tauxAnnuelPourcent: number,
  dureeMois: number,
  periodicite: PeriodiciteRemboursement = 'annuelle'
): {
  nombreEcheances: number
  montantEcheance: number
  totalInterets: number
  totalRemboursement: number
} {
  if (capital <= 0 || dureeMois <= 0) {
    return { nombreEcheances: 1, montantEcheance: 0, totalInterets: 0, totalRemboursement: 0 }
  }

  let echeancesParAn = 1
  if (periodicite === 'semestrielle') echeancesParAn = 2
  else if (periodicite === 'trimestrielle') echeancesParAn = 4
  else if (periodicite === 'mensuelle') echeancesParAn = 12

  const nombreAnnees = dureeMois / 12
  const nombreEcheances = Math.max(1, Math.round(nombreAnnees * echeancesParAn))

  const r = (tauxAnnuelPourcent / 100) / echeancesParAn

  let montantEcheance = 0
  if (r === 0) {
    montantEcheance = capital / nombreEcheances
  } else {
    // Formule d'annuité constante: C * r / (1 - (1+r)^-n)
    montantEcheance = (capital * r) / (1 - Math.pow(1 + r, -nombreEcheances))
  }

  const totalRemboursement = montantEcheance * nombreEcheances
  const totalInterets = Math.max(0, totalRemboursement - capital)

  return {
    nombreEcheances,
    montantEcheance: Math.round(montantEcheance),
    totalInterets: Math.round(totalInterets),
    totalRemboursement: Math.round(totalRemboursement),
  }
}
