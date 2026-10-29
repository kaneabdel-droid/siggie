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
 * Détermine si le crédit est indépendant de toute campagne agricole (pluriannuel)
 */
export function isCreditIndependant(credit: {
  but_credit?: string | null
}): boolean {
  return !!(credit.but_credit && credit.but_credit.includes('[INDEPENDANT:true]'))
}

/**
 * Récupère l'identifiant du matériel lié au crédit d'équipement (s'il est renseigné)
 */
export function getCreditMaterielId(credit: {
  materiel_id?: string | null
  but_credit?: string | null
}): string | null {
  if (credit.materiel_id) return credit.materiel_id
  if (credit.but_credit) {
    const match = credit.but_credit.match(/\[MATERIEL_ID:([^\]]+)\]/)
    if (match && match[1] && match[1].trim()) return match[1].trim()
  }
  return null
}

/**
 * Récupère la date d'acquisition du matériel / date de démarrage du crédit d'équipement
 */
export function getCreditDateAcquisition(credit: {
  date_acquisition?: string | null
  date_demande?: string | null
  but_credit?: string | null
  created_at?: string | null
}): string | null {
  if (credit.date_acquisition) return credit.date_acquisition
  if (credit.but_credit) {
    const match = credit.but_credit.match(/\[DATE_ACQUISITION:([^\]]+)\]/)
    if (match && match[1] && match[1].trim()) return match[1].trim()
  }
  return null
}

/**
 * Trouve le matériel correspondant à un crédit d'équipement dans la liste du parc matériel
 */
export function findLinkedMateriel<T extends { id: string; nom: string; date_acquisition?: string | null }>(
  credit: {
    materiel_id?: string | null
    equipement_nom?: string | null
    but_credit?: string | null
  },
  materiels?: T[] | null
): T | null {
  if (!materiels || materiels.length === 0) return null
  const matId = getCreditMaterielId(credit)
  if (matId) {
    const byId = materiels.find((m) => m.id === matId)
    if (byId) return byId
  }
  const equipNom = getCreditEquipementNom(credit)
  if (equipNom) {
    const normalized = equipNom.trim().toLowerCase()
    const byExactName = materiels.find((m) => m.nom?.trim().toLowerCase() === normalized)
    if (byExactName) return byExactName
    const byPartialName = materiels.find(
      (m) =>
         normalized.includes(m.nom?.trim().toLowerCase()) ||
        m.nom?.trim().toLowerCase().includes(normalized)
    )
    if (byPartialName) return byPartialName
  }
  return null
}

/**
 * Résout la date de démarrage du crédit d'équipement en la faisant correspondre
 * en priorité avec la date d'acquisition du matériel lié.
 */
export function resolveCreditEquipementStartDate(
  credit: {
    materiel_id?: string | null
    equipement_nom?: string | null
    date_acquisition?: string | null
    date_demande?: string | null
    but_credit?: string | null
    created_at?: string | null
  },
  materiels?: Array<{ id: string; nom: string; date_acquisition?: string | null }> | null
): string | null {
  const linkedMat = findLinkedMateriel(credit, materiels)
  if (linkedMat?.date_acquisition) {
    return linkedMat.date_acquisition
  }
  const metaDate = getCreditDateAcquisition(credit)
  if (metaDate) {
    return metaDate
  }
  if (credit.date_demande) {
    return credit.date_demande
  }
  return credit.created_at || null
}

/**
 * Parse une date ISO (YYYY-MM-DD ou timestamp) sans décalage de fuseau horaire
 */
export function parseLocalDate(dateStr: string | null | undefined): Date {
  if (!dateStr) return new Date()
  const clean = dateStr.trim()
  const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  }
  const parsed = new Date(clean)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

/**
 * Nettoie le motif du crédit des méta-tags pour l'affichage utilisateur
 */
export function cleanButCredit(butCredit: string | null | undefined): string {
  if (!butCredit) return ''
  return butCredit
    .replace(/\[TYPE:[^\]]+\]/g, '')
    .replace(/\[EQUIPEMENT:[^\]]*\]/g, '')
    .replace(/\[MATERIEL_ID:[^\]]*\]/g, '')
    .replace(/\[DATE_ACQUISITION:[^\]]*\]/g, '')
    .replace(/\[PERIODICITE:[^\]]*\]/g, '')
    .replace(/\[ECHEANCE:[^\]]*\]/g, '')
    .replace(/\[INDEPENDANT:[^\]]*\]/g, '')
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
