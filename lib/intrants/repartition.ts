// Répartition d'une quantité totale d'intrant entre les membres inscrits à une
// campagne, au prorata de la superficie que chacun exploite pour la campagne
// (campagne_membres.superficie). Voir la migration 37_repartition_intrants.sql.

export interface RepartirOptions {
  unite?: string | null
  nom?: string | null
}

/**
 * Détermine si une unité correspond à une mesure purement pondérale (kg, g, tonne)
 * Les sacs, bidons, flacons, litres, boîtes, etc. ne sont PAS du poids direct et doivent
 * être répartis en fractions usuelles (au quart : 0,25 / demi : 0,50 / 3/4 : 0,75).
 */
export function isWeightUnit(unite?: string | null): boolean {
  if (!unite) return false
  const clean = unite.trim().toLowerCase()
  if (
    clean.includes('sac') ||
    clean.includes('bidon') ||
    clean.includes('litre') ||
    clean.includes('flacon') ||
    clean.includes('boite') ||
    clean.includes('boîte') ||
    clean.includes('carton') ||
    clean.includes('rouleau') ||
    clean.includes('unite') ||
    clean.includes('unité')
  ) {
    return false
  }
  return /^(kg|kgs|kilo|kilos|kilogramme|kilogrammes|g|gr|gramme|grammes|t|tonne|tonnes)$/i.test(clean)
}

/**
 * Répartition au prorata des superficies :
 * - Si l'unité est du poids (kg, g, etc.) : arrondi au centième (2 décimales).
 * - Si l'unité n'est pas du poids (sacs, litres, etc.) : arrondi au quart (,25),
 *   au demi (,50) ou au trois-quarts (,75) selon la valeur la plus proche,
 *   SANS JAMAIS que le total proposé en distribution ne dépasse la quantité à distribuer.
 */
export function repartirAuProrata(
  quantiteTotale: number,
  superficies: { membre_id: string; superficie: number }[],
  options?: RepartirOptions
): Record<string, number> {
  const parts: Record<string, number> = {}
  const totalSuperficie = superficies.reduce((sum, s) => sum + (Number(s.superficie) || 0), 0)
  superficies.forEach((s) => { parts[s.membre_id] = 0 })
  if (!(quantiteTotale > 0) || !(totalSuperficie > 0)) return parts

  const isWeight = isWeightUnit(options?.unite)

  if (isWeight) {
    // Unités de poids : 2 décimales avec rattrapage exact
    let plusGrand: { membre_id: string; superficie: number } | null = null
    let reparti = 0
    for (const s of superficies) {
      const superficie = Number(s.superficie) || 0
      const part = Math.round((quantiteTotale * superficie / totalSuperficie) * 100) / 100
      parts[s.membre_id] = part
      reparti += part
      if (superficie > 0 && (!plusGrand || superficie > plusGrand.superficie)) {
        plusGrand = { membre_id: s.membre_id, superficie }
      }
    }
    if (plusGrand) {
      const ecart = Math.round((quantiteTotale - reparti) * 100) / 100
      parts[plusGrand.membre_id] = Math.round((parts[plusGrand.membre_id] + ecart) * 100) / 100
    }
    return parts
  }

  // Unités non pondérales : Arrondi au quart (,25 / ,50 / ,75 / entier)
  type Candidate = {
    membre_id: string
    superficie: number
    ideal: number
    part: number
    diff: number
  }

  const items: Candidate[] = []
  let totalArrondi = 0

  for (const s of superficies) {
    const superficie = Number(s.superficie) || 0
    const ideal = (quantiteTotale * superficie) / totalSuperficie
    // Arrondi au multiple de 0,25 le plus proche
    const part = Math.round(ideal * 4) / 4
    items.push({
      membre_id: s.membre_id,
      superficie,
      ideal,
      part,
      diff: part - ideal, // > 0 si arrondi vers le haut
    })
    totalArrondi += part
  }

  // Règle stricte : la somme proposée NE DOIT PAS dépasser la quantité totale à distribuer
  totalArrondi = Math.round(totalArrondi * 100) / 100
  let excessSteps = Math.round(Math.max(0, totalArrondi - quantiteTotale) * 4)

  while (excessSteps > 0) {
    // On décrémente de 0,25 les parts qui ont bénéficié du plus fort sur-arrondi
    items.sort((a, b) => b.diff - a.diff)
    const candidate = items.find((it) => it.part >= 0.25)
    if (!candidate) break
    candidate.part = Math.round((candidate.part - 0.25) * 100) / 100
    candidate.diff -= 0.25
    excessSteps--
  }

  for (const it of items) {
    parts[it.membre_id] = it.part
  }

  return parts
}
