'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/utils/supabase/permissions'

export async function getComptes() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Non authentifié")

  const { data: comptes, error } = await supabase
    .from('comptes')
    .select('*')
    .order('nom')

  if (error) {
    console.error(error)
    return { error: error.message }
  }

  // Pour chaque compte, on calcule le solde actuel (solde initial + entrees - sorties)
  const { data: transactions } = await supabase
    .from('transactions')
    .select('compte_id, type_transaction, montant')

  const comptesAvecSolde = comptes.map(compte => {
    let solde = Number(compte.solde_initial || 0)
    if (transactions) {
      const txs = transactions.filter(t => t.compte_id === compte.id)
      for (const t of txs) {
        if (t.type_transaction === 'entree') solde += Number(t.montant)
        else if (t.type_transaction === 'sortie') solde -= Number(t.montant)
      }
    }
    return { ...compte, solde_courant: solde }
  })

  return { comptes: comptesAvecSolde }
}

export async function addCompte(nom: string, type_compte: string, solde_initial: number) {
  const denied = await requirePermission('tresorerie', 'create')
  if (denied) return denied as never
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non authentifié" }

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('gie_id')
    .eq('id', user.id)
    .single()
    
  if (!userData) return { error: "Utilisateur introuvable" }

  const { error } = await supabase
    .from('comptes')
    .insert({
      gie_id: userData.gie_id,
      nom,
      type_compte,
      solde_initial
    })

  if (error) return { error: error.message }

  revalidatePath('/tresorerie')
  revalidatePath('/tresorerie/journaux')
  return { success: true }
}

export async function addTransaction(data: {
  compte_id: string
  type_transaction: string
  montant: number
  motif: string
  date_transaction?: string
  credit_id?: string
  type_piece?: string
  reference_piece?: string
  imputation_id?: string
  campagne_id?: string
  tiers_type?: string
  tiers_nom?: string
  compte_destination_id?: string
  materiel_id?: string
  materiel_nom?: string
}) {
  const denied = await requirePermission('tresorerie', 'create')
  if (denied) return denied as never
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non authentifié" }

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('gie_id')
    .eq('id', user.id)
    .single()

  if (!userData) return { error: "Utilisateur introuvable" }
  if (!data.montant || data.montant <= 0) return { error: "Montant invalide" }

  const dateTx = data.date_transaction || new Date().toISOString().slice(0, 10)

  // Cas spécial : Virement entre caisses / comptes (double imputation rigoureusement équilibrée)
  if (data.tiers_type === 'compte_transfert' && data.compte_destination_id) {
    if (data.compte_id === data.compte_destination_id) {
      return { error: "Le compte d'origine et le compte de destination doivent être distincts." }
    }

    const { data: comptesData } = await supabase
      .from('comptes')
      .select('id, nom')
      .in('id', [data.compte_id, data.compte_destination_id])

    const compteOrigine = comptesData?.find((c) => c.id === data.compte_id)
    const compteDest = comptesData?.find((c) => c.id === data.compte_destination_id)

    const nomOrigine = compteOrigine?.nom || 'Compte Origine'
    const nomDest = compteDest?.nom || 'Compte Destination'

    const refTag = data.reference_piece?.trim() ? ` [REF:${data.reference_piece.trim()}]` : ''
    const userComment = data.motif?.trim() ? ` (${data.motif.trim()})` : ''

    if (data.type_transaction === 'entree') {
      // Le compte courant reçoit le virement (entrée), l'autre compte est la source (sortie)
      const motifCurrent = `Virement reçu de ${nomDest}${userComment}${refTag} [TIERS:${nomDest}]`
      const motifOther = `Virement vers ${nomOrigine}${userComment}${refTag} [TIERS:${nomOrigine}]`

      const insertCurrent = await supabase.from('transactions').insert({
        gie_id: userData.gie_id,
        compte_id: data.compte_id,
        type_transaction: 'entree',
        montant: data.montant,
        motif: motifCurrent,
        type_piece: 'virement_interne',
        date_transaction: dateTx,
        campagne_id: data.campagne_id || null,
      })
      if (insertCurrent.error) return { error: insertCurrent.error.message }

      const insertOther = await supabase.from('transactions').insert({
        gie_id: userData.gie_id,
        compte_id: data.compte_destination_id,
        type_transaction: 'sortie',
        montant: data.montant,
        motif: motifOther,
        type_piece: 'virement_interne',
        date_transaction: dateTx,
        campagne_id: data.campagne_id || null,
      })
      if (insertOther.error) return { error: insertOther.error.message }
    } else {
      // Sortie sur le compte courant (décaissement), entrée sur le compte destination
      const motifSortie = `Virement vers ${nomDest}${userComment}${refTag} [TIERS:${nomDest}]`
      const motifEntree = `Virement reçu de ${nomOrigine}${userComment}${refTag} [TIERS:${nomOrigine}]`

      const insertSortie = await supabase.from('transactions').insert({
        gie_id: userData.gie_id,
        compte_id: data.compte_id,
        type_transaction: 'sortie',
        montant: data.montant,
        motif: motifSortie,
        type_piece: 'virement_interne',
        date_transaction: dateTx,
        campagne_id: data.campagne_id || null,
      })
      if (insertSortie.error) return { error: insertSortie.error.message }

      const insertEntree = await supabase.from('transactions').insert({
        gie_id: userData.gie_id,
        compte_id: data.compte_destination_id,
        type_transaction: 'entree',
        montant: data.montant,
        motif: motifEntree,
        type_piece: 'virement_interne',
        date_transaction: dateTx,
        campagne_id: data.campagne_id || null,
      })
      if (insertEntree.error) return { error: insertEntree.error.message }
    }

    revalidatePath('/tresorerie')
    revalidatePath('/tresorerie/journaux')
    return { success: true }
  }

  // Formatage du motif avec tags référence, tiers et matériel pour backward compatibility totale
  let safeMotif = data.motif?.trim() || 'Opération'
  if (data.reference_piece?.trim()) {
    safeMotif = `${safeMotif} [REF:${data.reference_piece.trim()}]`
  }
  if (data.tiers_nom?.trim()) {
    safeMotif = `${safeMotif} [TIERS:${data.tiers_nom.trim()}]`
  }
  if (data.materiel_nom?.trim()) {
    safeMotif = `${safeMotif} [MATERIEL:${data.materiel_nom.trim()}]`
  }

  // Insertion en utilisant exclusivement les colonnes réelles de la table transactions
  const { error } = await supabase
    .from('transactions')
    .insert({
      gie_id: userData.gie_id,
      compte_id: data.compte_id,
      type_transaction: data.type_transaction,
      montant: data.montant,
      motif: safeMotif,
      date_transaction: dateTx,
      credit_id: data.credit_id || null,
      type_piece: data.type_piece || null,
      imputation_id: data.imputation_id || null,
      campagne_id: data.campagne_id || null,
    })

  if (error) {
    console.error("Erreur insertion transaction:", error)
    return { error: error.message }
  }

  revalidatePath('/tresorerie')
  revalidatePath('/tresorerie/journaux')
  return { success: true }
}

export async function updateTransaction(
  id: string,
  data: {
    type_transaction: string
    montant: number
    motif: string
    type_piece?: string
    imputation_id?: string
    campagne_id?: string
    date_transaction?: string
    reference_piece?: string
  }
) {
  const denied = await requirePermission('tresorerie', 'update')
  if (denied) return denied as never
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non authentifié" }

  // Conserver ou actualiser la référence dans le motif
  let safeMotif = data.motif.replace(/\[REF:.*?\]/g, '').trim()
  if (data.reference_piece?.trim()) {
    safeMotif = `${safeMotif} [REF:${data.reference_piece.trim()}]`
  }

  const updatePayload: any = {
    type_transaction: data.type_transaction,
    montant: data.montant,
    motif: safeMotif,
    type_piece: data.type_piece || null,
    imputation_id: data.imputation_id || null,
    campagne_id: data.campagne_id || null,
    date_transaction: data.date_transaction || new Date().toISOString().slice(0, 10),
  }

  const { error } = await supabase
    .from('transactions')
    .update(updatePayload)
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/tresorerie')
  revalidatePath('/tresorerie/journaux')
  revalidatePath('/credits')
  return { success: true }
}

export async function deleteTransaction(id: string) {
  const denied = await requirePermission('tresorerie', 'delete')
  if (denied) return denied as never
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non authentifié" }

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/tresorerie')
  revalidatePath('/tresorerie/journaux')
  revalidatePath('/credits')
  return { success: true }
}

export async function getJournal(compteId: string) {
  const supabase = await createClient()

  const { data: compte } = await supabase
    .from('comptes')
    .select('solde_initial, nom, type_compte')
    .eq('id', compteId)
    .single()

  if (!compte) return { error: "Compte introuvable" }

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('compte_id', compteId)

  if (error) return { error: error.message }

  // Tri chronologique rigoureux prenant en compte la date modifiable de l'opération
  const sortedTxs = (transactions || []).slice().sort((a, b) => {
    const da = a.date_transaction || (a.created_at ? a.created_at.slice(0, 10) : '')
    const db = b.date_transaction || (b.created_at ? b.created_at.slice(0, 10) : '')
    if (da !== db) return da.localeCompare(db)
    return (a.created_at || '').localeCompare(b.created_at || '')
  })

  let soldeCourant = Number(compte.solde_initial || 0)

  // Map to calculate equipment breakdown
  const matMap = new Map<string, { nom: string; entrees: number; sorties: number }>()
  
  const journal = sortedTxs.map(tx => {
    let entree = null
    let sortie = null
    const montant = Number(tx.montant || 0)

    if (tx.type_transaction === 'entree') {
      entree = montant
      soldeCourant += entree
    } else {
      sortie = montant
      soldeCourant -= sortie
    }

    const motifStr = String(tx.motif || '')

    // Extract reference from column or motif
    let referencePiece: string | null = (tx as any).reference_piece || null
    const matchRef = motifStr.match(/\[REF:(.*?)\]/)
    if (matchRef) {
      referencePiece = matchRef[1].trim()
    }

    // Extract tiers from column or motif
    let tiersNom = tx.tiers_nom || null
    if (!tiersNom) {
      const matchTiers = motifStr.match(/\[TIERS:(.*?)\]/)
      if (matchTiers) tiersNom = matchTiers[1].trim()
    }

    // Extract materiel from column or motif
    let materielNom: string | null = null
    const matchMat = motifStr.match(/\[MATERIEL:(.*?)\]/)
    if (matchMat) {
      materielNom = matchMat[1].trim()
      const existing = matMap.get(materielNom) || { nom: materielNom, entrees: 0, sorties: 0 }
      if (tx.type_transaction === 'entree') existing.entrees += montant
      else existing.sorties += montant
      matMap.set(materielNom, existing)
    }

    const cleanMotif = motifStr
      .replace(/\[TIERS:.*?\]/g, '')
      .replace(/\[MATERIEL:.*?\]/g, '')
      .replace(/\[REF:.*?\]/g, '')
      .trim()

    return {
      ...tx,
      date_effective: tx.date_transaction || (tx.created_at ? tx.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10)),
      motif_affiche: cleanMotif,
      tiers_affiche: tiersNom || '-',
      materiel_nom: materielNom,
      reference_piece: referencePiece,
      entree,
      sortie,
      solde: soldeCourant
    }
  })

  const repartitionMateriel = Array.from(matMap.values()).map(m => ({
    ...m,
    net: m.entrees - m.sorties
  }))

  return { 
    journal: journal.reverse(), 
    soldeInitial: compte.solde_initial, 
    compteNom: compte.nom,
    compteType: compte.type_compte,
    repartitionMateriel,
  }
}

export async function getRapprochement(campagneId: string) {
  const supabase = await createClient()

  // 1. Récupérer le crédit lié à la campagne
  const { data: credit } = await supabase
    .from('credits')
    .select('*')
    .eq('campagne_id', campagneId)
    .single()

  if (!credit) return { error: "Aucun crédit trouvé pour cette campagne." }

  // 2. Récupérer les transactions liées à ce crédit
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*, comptes(nom)')
    .eq('credit_id', credit.id)

  const montantAccorde = Number(credit.montant_accorde || 0)
  
  let totalPaiementsFournisseurs = 0
  let totalRetraits = 0

  const paiementsFournisseurs = []
  const retraits = []

  if (transactions) {
    for (const t of transactions) {
      if (t.type_piece === 'facture_fournisseur') {
        totalPaiementsFournisseurs += Number(t.montant)
        paiementsFournisseurs.push(t)
      } else if (t.type_piece === 'retrait_espece') {
        totalRetraits += Number(t.montant)
        retraits.push(t)
      }
    }
  }

  const soldeCredit = montantAccorde - (totalPaiementsFournisseurs + totalRetraits)

  return {
    credit,
    paiementsFournisseurs,
    retraits,
    bilan: {
      montantAccorde,
      totalPaiementsFournisseurs,
      totalRetraits,
      soldeCredit
    }
  }
}

