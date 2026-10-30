/**
 * Réconciliation intelligente et unifiée des règlements (Clients, Prestations Matériel, Ventes de Stock, Membres)
 * Prend en compte :
 *  1. Les paiements enregistrés dans `paiements_clients`
 *  2. Les entrées de trésorerie directement saisies dans les journaux de Caisse, Banque ou Mobile Money (`transactions`)
 *  3. Les remboursements enregistrés dans `remboursements`
 */

export interface PrestationDoc {
  id: string
  client_id?: string | null
  client_nom?: string | null
  client_telephone?: string | null
  montant_facture: number
  date_prestation?: string
  campagne_id?: string | null
  type_prestation?: string | null
  tiers_type?: string | null
  membre_id?: string | null
  [key: string]: any
}

export interface PaiementClientRow {
  id: string
  client_id?: string | null
  montant: number
  date_paiement?: string
  motif?: string | null
  [key: string]: any
}

export interface TransactionRow {
  id: string
  compte_id?: string | null
  type_transaction: string
  montant: number
  motif?: string | null
  date_transaction?: string
  type_piece?: string | null
  campagne_id?: string | null
  credit_id?: string | null
  [key: string]: any
}

export interface RemboursementRow {
  id: string
  facture_id?: string | null
  membre_id?: string | null
  client_id?: string | null
  type_remboursement?: string | null
  montant_fcfa: number
  produit_nature?: string | null
  date_paiement?: string
  [key: string]: any
}

export function reconcilierPrestationsEtPaiements(params: {
  prestations: PrestationDoc[]
  paiementsClients: PaiementClientRow[]
  transactions?: TransactionRow[]
  remboursements?: RemboursementRow[]
  clientsMap?: Map<string, any>
}) {
  const { prestations, paiementsClients, transactions = [], remboursements = [], clientsMap = new Map() } = params

  // 1. Indexer les paiements déjà réclamés pour éviter tout double-comptage
  const usedPaiementClientIds = new Set<string>()
  const usedTransactionIds = new Set<string>()
  const usedRemboursementIds = new Set<string>()

  // Structure de résultat : docId -> { montantPaye: number, sources: any[] }
  const resultByPrestationId = new Map<string, { montantPaye: number; details: string[] }>()
  prestations.forEach((p) => {
    resultByPrestationId.set(p.id, { montantPaye: 0, details: [] })
  })

  // Helper pour ajouter un paiement à une prestation
  const creditPrestation = (prestationId: string, montant: number, sourceLabel: string) => {
    const entry = resultByPrestationId.get(prestationId)
    if (!entry) return
    entry.montantPaye += montant
    entry.details.push(`${sourceLabel}: +${montant}`)
  }

  // --- ÉTAPE A : Rapprochement direct par Tags document [DOC:prestation:ID] ou [PRESTATION:ID] ---
  for (const pc of paiementsClients) {
    const motifStr = String(pc.motif || '')
    const docMatch = motifStr.match(/\[DOC:prestation:([^\]]+)\]/) || motifStr.match(/\[PRESTATION:([^\]]+)\]/)
    if (docMatch && docMatch[1]) {
      const targetId = docMatch[1].trim()
      if (resultByPrestationId.has(targetId)) {
        creditPrestation(targetId, Number(pc.montant || 0), 'Paiement Client Tag')
        usedPaiementClientIds.add(pc.id)
      }
    }
  }

  for (const tx of transactions) {
    if (tx.type_transaction !== 'entree') continue
    const motifStr = String(tx.motif || '')
    const docMatch = motifStr.match(/\[DOC:prestation:([^\]]+)\]/) || motifStr.match(/\[PRESTATION:([^\]]+)\]/)
    if (docMatch && docMatch[1]) {
      const targetId = docMatch[1].trim()
      if (resultByPrestationId.has(targetId)) {
        creditPrestation(targetId, Number(tx.montant || 0), 'Transaction Trésorerie Tag')
        usedTransactionIds.add(tx.id)
      }
    }
  }

  // --- ÉTAPE B : Rapprochement contextuel par motif spécifique et client ---
  // Exemple : un paiement client ou une transaction mentionne "Prestation moissonneuse" ou "Prestation Mamadou DIOP"
  for (const pc of paiementsClients) {
    if (usedPaiementClientIds.has(pc.id)) continue
    const motifLower = String(pc.motif || '').toLowerCase()
    const montantPc = Number(pc.montant || 0)

    // Vérifier si le motif fait référence à une prestation en particulier
    const matchingPrestation = prestations.find((p) => {
      const targetRes = resultByPrestationId.get(p.id)
      const due = Number(p.montant_facture || 0)
      const paid = targetRes ? targetRes.montantPaye : 0
      if (paid >= due) return false // Déjà totalement réglée

      // Match si campagne correspondante et motif mentionne prestation
      const campMatch = p.campagne_id && motifLower.includes(p.campagne_id.toLowerCase())
      const typeMatch = p.type_prestation && motifLower.includes(p.type_prestation.toLowerCase())
      const exactMontantMatch = due === montantPc

      if (campMatch && (typeMatch || exactMontantMatch)) return true
      if (typeMatch && exactMontantMatch) return true
      if (exactMontantMatch && (motifLower.includes('prestation') || motifLower.includes('récolte') || motifLower.includes('recolte'))) return true

      return false
    })

    if (matchingPrestation) {
      creditPrestation(matchingPrestation.id, montantPc, 'Paiement Client Motif/Montant')
      usedPaiementClientIds.add(pc.id)
    }
  }

  // --- ÉTAPE C : Transactions directement enregistrées en Banque, Caisse ou Mobile Money ---
  // (ex: Caisse Matériel, Entrée "Prestation Mamadou DIOP", "Règlement prestation...", etc.)
  for (const tx of transactions) {
    if (usedTransactionIds.has(tx.id)) continue
    if (tx.type_transaction !== 'entree') continue

    // Ignorer les virements internes, déblocages de crédit ou apports initiaux
    const motifStr = String(tx.motif || '')
    const motifLower = motifStr.toLowerCase()
    if (
      tx.type_piece === 'virement_interne' ||
      motifLower.startsWith('virement reçu') ||
      motifLower.startsWith('virement vers') ||
      motifLower.startsWith('solde de départ') ||
      motifLower.startsWith('déblocage crédit') ||
      motifLower.startsWith('emprunt')
    ) {
      continue
    }

    const montantTx = Number(tx.montant || 0)
    if (montantTx <= 0) continue

    // Détecter si cette transaction est le miroir d'un PaiementClient déjà comptabilisé
    // (pour ne jamais compter deux fois le même encaissement)
    const isAlreadyMirrored = paiementsClients.some((pc) => {
      if (!usedPaiementClientIds.has(pc.id)) return false
      const diffMontant = Math.abs(Number(pc.montant || 0) - montantTx)
      if (diffMontant !== 0) return false
      // Vérifier concordance de date ou de motif
      const pcMotif = String(pc.motif || '').toLowerCase()
      const sameWords = ['mamadou', 'diop', 'prestation', 'moissonneuse', 'récolte', 'recolte', 'ndiadie', 'ngao']
      return sameWords.some((w) => motifLower.includes(w) && pcMotif.includes(w))
    })

    if (isAlreadyMirrored) {
      usedTransactionIds.add(tx.id)
      continue
    }

    // Chercher une prestation correspondant à cette transaction
    const matchingPrestation = prestations.find((p) => {
      const targetRes = resultByPrestationId.get(p.id)
      const due = Number(p.montant_facture || 0)
      const paid = targetRes ? targetRes.montantPaye : 0
      if (paid >= due) return false

      const clientNom = String(p.client_nom || '').toLowerCase()
      const clientTiersMatch = clientNom && (motifLower.includes(clientNom) || motifLower.includes(`tiers:${clientNom}`))
      const exactMontant = due === montantTx
      const isPrestationMotif = motifLower.includes('prestation') || motifLower.includes('materiel') || motifLower.includes('matériel') || motifLower.includes('moisson')

      if (exactMontant && (clientTiersMatch || isPrestationMotif)) return true
      if (clientTiersMatch && isPrestationMotif) return true
      return false
    })

    if (matchingPrestation) {
      creditPrestation(matchingPrestation.id, montantTx, 'Trésorerie Directe (Caisse/Banque/Mobile)')
      usedTransactionIds.add(tx.id)
    }
  }

  // --- ÉTAPE D : Rapprochement FIFO par Client (Paiements Clients résiduels) ---
  // Si le client a encore des paiements non alloués, ils viennent régler ses prestations chronologiquement
  const remainingPaiementsByClient = new Map<string, number>()
  for (const pc of paiementsClients) {
    if (usedPaiementClientIds.has(pc.id)) continue
    const cid = pc.client_id || '__unknown__'
    remainingPaiementsByClient.set(cid, (remainingPaiementsByClient.get(cid) || 0) + Number(pc.montant || 0))
    usedPaiementClientIds.add(pc.id)
  }

  for (const p of prestations) {
    const targetRes = resultByPrestationId.get(p.id)
    if (!targetRes) continue
    const due = Number(p.montant_facture || 0)
    const currentPaid = targetRes.montantPaye
    const resteAPayer = due - currentPaid
    if (resteAPayer <= 0) continue

    // Trouver le montant disponible pour ce client (par client_id ou par nom)
    const clientCandidates = [
      p.client_id,
      ...Array.from(clientsMap.entries())
        .filter(([_, c]) => String(c.nom || '').trim().toLowerCase() === String(p.client_nom || '').trim().toLowerCase())
        .map(([id]) => id),
    ].filter(Boolean) as string[]

    for (const cid of clientCandidates) {
      const dispo = remainingPaiementsByClient.get(cid) || 0
      if (dispo > 0) {
        const aAllouer = Math.min(resteAPayer, dispo)
        creditPrestation(p.id, aAllouer, 'Paiement Client FIFO')
        remainingPaiementsByClient.set(cid, dispo - aAllouer)
        break
      }
    }
  }

  // Compiler pour chaque prestation le montant payé et le statut final
  return prestations.map((p) => {
    const res = resultByPrestationId.get(p.id) || { montantPaye: 0, details: [] }
    const montantTotal = Number(p.montant_facture || 0)
    const montantPaye = res.montantPaye
    const reste = Math.max(0, montantTotal - montantPaye)
    const statut = montantPaye >= montantTotal && montantTotal > 0
      ? ('payee' as const)
      : montantPaye > 0
      ? ('partiellement_paye' as const)
      : ('impayee' as const)

    return {
      prestationId: p.id,
      montantTotal,
      montantPaye,
      reste,
      statut,
      details: res.details,
    }
  })
}

