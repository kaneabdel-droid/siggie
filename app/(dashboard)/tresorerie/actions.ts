'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

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
  return { success: true }
}

export async function addTransaction(data: { compte_id: string, type_transaction: string, montant: number, motif: string, credit_id?: string, type_piece?: string }) {
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
    .from('transactions')
    .insert({
      gie_id: userData.gie_id,
      compte_id: data.compte_id,
      type_transaction: data.type_transaction,
      montant: data.montant,
      motif: data.motif,
      credit_id: data.credit_id || null,
      type_piece: data.type_piece || null
    })

  if (error) return { error: error.message }

  revalidatePath('/tresorerie')
  return { success: true }
}

export async function getJournal(compteId: string) {
  const supabase = await createClient()

  const { data: compte } = await supabase
    .from('comptes')
    .select('solde_initial, nom')
    .eq('id', compteId)
    .single()

  if (!compte) return { error: "Compte introuvable" }

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('compte_id', compteId)
    .order('created_at', { ascending: true }) // Ordre chronologique strict

  if (error) return { error: error.message }

  let soldeCourant = Number(compte.solde_initial || 0)
  
  const journal = (transactions || []).map(tx => {
    let entree = null
    let sortie = null
    if (tx.type_transaction === 'entree') {
      entree = Number(tx.montant)
      soldeCourant += entree
    } else {
      sortie = Number(tx.montant)
      soldeCourant -= sortie
    }
    return {
      ...tx,
      entree,
      sortie,
      solde: soldeCourant
    }
  })

  return { 
    journal: journal.reverse(), 
    soldeInitial: compte.solde_initial, 
    compteNom: compte.nom 
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

