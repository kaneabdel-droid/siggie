// Répartition d'une quantité totale d'intrant entre les membres inscrits à une
// campagne, au prorata de la superficie que chacun exploite pour la campagne
// (campagne_membres.superficie). Voir la migration 37_repartition_intrants.sql.

// Les parts sont arrondies au centième ; l'écart d'arrondi est reporté sur le
// membre ayant la plus grande superficie pour que la somme des parts retombe
// exactement sur la quantité totale.
export function repartirAuProrata(
  quantiteTotale: number,
  superficies: { membre_id: string; superficie: number }[]
): Record<string, number> {
  const parts: Record<string, number> = {}
  const totalSuperficie = superficies.reduce((sum, s) => sum + (Number(s.superficie) || 0), 0)
  superficies.forEach((s) => { parts[s.membre_id] = 0 })
  if (!(quantiteTotale > 0) || !(totalSuperficie > 0)) return parts

  let plusGrand: { membre_id: string; superficie: number } | null = null
  let reparti = 0
  for (const s of superficies) {
    const superficie = Number(s.superficie) || 0
    const part = Math.round((quantiteTotale * superficie / totalSuperficie) * 100) / 100
    parts[s.membre_id] = part
    reparti += part
    if (superficie > 0 && (!plusGrand || superficie > plusGrand.superficie)) plusGrand = { membre_id: s.membre_id, superficie }
  }
  if (plusGrand) {
    const ecart = Math.round((quantiteTotale - reparti) * 100) / 100
    parts[plusGrand.membre_id] = Math.round((parts[plusGrand.membre_id] + ecart) * 100) / 100
  }
  return parts
}

