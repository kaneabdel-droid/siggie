/**
 * Utilitaire de détection et prévention des doublons de remboursements
 * Règle métier : (même membre + même montant) ET (même campagne OU même date OU même référence pièce) = doublon
 */

export interface DoublonCheckParams {
  gieId: string
  membreId: string | null
  montant: number
  datePaiement?: string | null
  referencePiece?: string | null
  factureId?: string | null
  campagneId?: string | null
  excludeRemboursementId?: string | null
}

export interface DoublonResult {
  isDoublon: boolean
  existingId?: string
  reason?: string
}

export async function findDoublonRemboursement(
  supabase: any,
  params: DoublonCheckParams
): Promise<DoublonResult> {
  if (!params.membreId || !params.montant || params.montant <= 0) {
    return { isDoublon: false }
  }

  // Requête des remboursements existants pour ce membre avec le montant identique
  let query = supabase
    .from('remboursements')
    .select('id, date_paiement, reference_piece, facture_id, montant_fcfa, created_at, factures(id, campagne_id)')
    .eq('gie_id', params.gieId)
    .eq('membre_id', params.membreId)
    .eq('montant_fcfa', params.montant)

  if (params.excludeRemboursementId) {
    query = query.neq('id', params.excludeRemboursementId)
  }

  const { data: candidates, error } = await query

  if (error || !candidates || candidates.length === 0) {
    return { isDoublon: false }
  }

  const cleanDate = params.datePaiement ? params.datePaiement.slice(0, 10) : ''
  const cleanRef = params.referencePiece ? params.referencePiece.trim().toLowerCase() : ''

  for (const c of candidates) {
    const cDate = c.date_paiement
      ? c.date_paiement.slice(0, 10)
      : c.created_at
      ? c.created_at.slice(0, 10)
      : ''
    const cRef = c.reference_piece ? c.reference_piece.trim().toLowerCase() : ''
    const cFacture = Array.isArray((c as any).factures) ? (c as any).factures[0] : ((c as any).factures || (c as any).facture)
    const cCampagneId = cFacture?.campagne_id || null

    // 1. Même référence de pièce (si renseignée des deux côtés)
    if (cleanRef && cRef && cleanRef === cRef) {
      return {
        isDoublon: true,
        existingId: c.id,
        reason: `Même référence de pièce (${params.referencePiece}) et même montant (${params.montant.toLocaleString('fr-FR')} FCFA)`,
      }
    }

    // 2. Même date de versement
    if (cleanDate && cDate && cleanDate === cDate) {
      return {
        isDoublon: true,
        existingId: c.id,
        reason: `Même date (${cleanDate}) et même montant (${params.montant.toLocaleString('fr-FR')} FCFA)`,
      }
    }

    // 3. Même facture ciblée
    if (params.factureId && c.facture_id && params.factureId === c.facture_id) {
      return {
        isDoublon: true,
        existingId: c.id,
        reason: `Remboursement identique de ${params.montant.toLocaleString('fr-FR')} FCFA déjà enregistré sur cette facture`,
      }
    }

    // 4. Même campagne de rattachement
    if (params.campagneId && cCampagneId && params.campagneId === cCampagneId) {
      return {
        isDoublon: true,
        existingId: c.id,
        reason: `Remboursement identique de ${params.montant.toLocaleString('fr-FR')} FCFA déjà enregistré sur cette campagne`,
      }
    }
  }

  return { isDoublon: false }
}
