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

  // 1. Décodage base64 (prioritaire, 100% insensible aux caractères spéciaux et crochets)
  const mB64 = observations.match(/\[SPEC_PARCELLES_B64:([A-Za-z0-9+/=]+)\]/)
  if (mB64) {
    try {
      const json = typeof Buffer !== 'undefined'
        ? Buffer.from(mB64[1], 'base64').toString('utf8')
        : decodeURIComponent(escape(atob(mB64[1])))
      const list = JSON.parse(json)
      if (Array.isArray(list)) return list
    } catch {
      // continuer vers repli
    }
  }

  // 2. Décodage tag JSON brut [SPEC_PARCELLES:[...]] (compatible avec données existantes)
  const startIdx = observations.indexOf('[SPEC_PARCELLES:')
  if (startIdx !== -1) {
    const after = observations.slice(startIdx + '[SPEC_PARCELLES:'.length)
    const lastBracket = after.lastIndexOf(']')
    if (lastBracket !== -1) {
      try {
        const json = after.slice(0, lastBracket)
        const list = JSON.parse(json)
        if (Array.isArray(list)) return list
      } catch {
        // continuer
      }
    }
  }

  return []
}

export function encoderParcellesObservations(
  observations: string | null | undefined,
  parcelles: MembreSpeculationEntry[]
): string {
  // Nettoyer tout ancien tag base64 ou brut
  let clean = (observations || '')
    .replace(/\[SPEC_PARCELLES_B64:[A-Za-z0-9+/=]+\]/g, '')
    .replace(/\[SPEC_PARCELLES:[\s\S]*?\]\]/g, '')
    .replace(/\[SPEC_PARCELLES:[\s\S]*?\]/g, '')
    .trim()

  // Supprimer d'éventuels crochets orphelins résiduels
  clean = clean.replace(/^[\]\s]+/g, '').trim()

  const jsonStr = JSON.stringify(parcelles)
  const b64 = typeof Buffer !== 'undefined'
    ? Buffer.from(jsonStr).toString('base64')
    : btoa(unescape(encodeURIComponent(jsonStr)))

  const tag = `[SPEC_PARCELLES_B64:${b64}]`
  return clean ? `${clean}\n${tag}` : tag
}

