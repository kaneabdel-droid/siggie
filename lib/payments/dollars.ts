// GIE d'un pays dont la devise n'est pas gérée (« Autre pays », lib/pays.ts, devise AUCUNE) : abonnement payé par
// carte en dollars US (Moneroo). Prix FCFA convertis à ce taux fixe et arrondis au dollar — seule valeur à modifier
// pour réviser les prix en dollars.
export const TAUX_FCFA_PAR_USD = 600

export function montantUsd(montantFcfa: number): number {
  return Math.max(1, Math.round(montantFcfa / TAUX_FCFA_PAR_USD))
}

/** Équivalent FCFA (statistiques de ventes exprimées en FCFA). */
export function equivalentFcfa(montant: number, devise: string | null | undefined): number {
  return devise === 'USD' ? Math.round(montant * TAUX_FCFA_PAR_USD) : montant
}

/** Montant d'un paiement d'abonnement avec sa devise. */
export function formatPaiement(montant: number, devise: string | null | undefined): string {
  return devise === 'USD' ? `${Number(montant).toLocaleString('en-US')} $` : `${Number(montant).toLocaleString('fr-FR')} FCFA`
}
