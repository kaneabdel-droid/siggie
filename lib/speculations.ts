/**
 * Service de gestion et d'analyse multi-spéculations pour SIGGIE
 * Permet le suivi par culture (Oignon, Tomate, Riz...) et le récapitulatif par membre.
 */

export interface CampagneSpeculation {
  id: string
  campagne_id: string
  gie_id?: string
  nom: string
  variete?: string | null
  produit_collecte?: string | null
  prix_collecte: number
  poids_standard: number
  unite_mesure: string
  credit_alloue: number
  rendement_prevu_tonne_ha: number
  statut: string
  created_at?: string
}

export interface MembreSpeculationEntry {
  id?: string
  campagne_id: string
  membre_id: string
  speculation_id: string
  superficie: number
  superficie_validee?: number | null
  casier?: string | null
  statut_validation?: string
  credit_attribue: number
}

export interface SyntheseSpeculation {
  speculation: CampagneSpeculation
  membresCount: number
  superficieTotale: number
  superficieValideeTotale: number
  creditAlloue: number
  facturationTotale: number
  poidsCollecteKg: number
  prixCollecte: number
  valeurCollecte: number
  remboursementsTotaux: number
  tauxRecouvrement: number
  soldeRestant: number
}

export interface MembreSpeculationDetail {
  speculationId: string
  nom: string
  superficie: number
  superficieValidee: number
  creditAttribue: number
  collecteQte: number
  collecteVal: number
}

export interface RecapitulatifMembre {
  membreId: string
  nom: string
  prenom: string
  codeMembre: string
  telephone?: string | null
  village?: string | null
  speculations: MembreSpeculationDetail[]
  superficieTotale: number
  creditTotal: number
  facturationTotale: number
  collecteQteTotale: number
  collecteValeurTotale: number
  remboursementsTotaux: number
  soldeNet: number
  statutSolde: 'solde' | 'excedent' | 'reliquat'
}

/**
 * Extrait le nom de la spéculation depuis une chaîne ou un tag [SPEC:xxx]
 */
export function extraireTagSpeculation(str?: string | null): string | null {
  if (!str) return null
  const m = str.match(/\[SPEC:([^\]]+)\]/)
  return m ? m[1].trim() : null
}

export function extraireParcellesObservations(observations?: string | null): MembreSpeculationEntry[] {
  if (!observations) return []
  const match = observations.match(/\[SPEC_PARCELLES:([\s\S]*?)\]/)
  if (!match) return []
  try {
    const list = JSON.parse(match[1])
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function encoderParcellesObservations(
  observations: string | null | undefined,
  parcelles: MembreSpeculationEntry[]
): string {
  const clean = (observations || '').replace(/\[SPEC_PARCELLES:[\s\S]*?\]/g, '').trim()
  const tag = `[SPEC_PARCELLES:${JSON.stringify(parcelles)}]`
  return clean ? `${clean}\n${tag}` : tag
}

