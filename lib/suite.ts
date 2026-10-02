/**
 * Page où renvoyer après connexion, inscription ou confirmation d'email (paramètre « next »).
 * Seuls les chemins internes sont acceptés : jamais une autre adresse (redirection ouverte).
 */
export function pageSuivante(valeur: FormDataEntryValue | string | null | undefined): string | null {
  const v = typeof valeur === 'string' ? valeur.trim() : ''
  return v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/\\') ? v : null
}

/** Page de paiement d'un forfait choisi sur les tarifs (null si le forfait est inconnu). */
export function suitePaiement(plan: string | null | undefined): string | null {
  return plan && ['standard', 'medium', 'premium'].includes(plan) ? `/checkout?plan=${plan}` : null
}
