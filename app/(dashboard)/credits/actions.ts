'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addCredit(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Non authentifié")

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('gie_id')
    .eq('id', user.id)
    .single()
    
  if (!userData) throw new Error("Utilisateur introuvable")

  const data = {
    gie_id: userData.gie_id,
    campagne_id: formData.get('campagne_id'),
    banque_nom: formData.get('banque_nom') || null,
    montant_demande: parseFloat(formData.get('montant_demande') as string) || 0,
    but_credit: formData.get('but_credit') || null,
  }

  const { error } = await supabase.from('credits').insert([data])

  if (error) {
    console.error("Erreur ajout credit:", error)
    return { error: error.message }
  }

  revalidatePath('/credits')
  return { success: true }
}

export async function updateCreditStatus(id: string, statut: string, montant_accorde?: number) {
  const supabase = await createClient()

  const data: any = { statut }
  if (montant_accorde !== undefined) {
    data.montant_accorde = montant_accorde
  }

  const { error } = await supabase
    .from('credits')
    .update(data)
    .eq('id', id)

  if (error) {
    console.error("Erreur modification statut credit:", error)
    return { error: error.message }
  }

  revalidatePath('/credits')
  return { success: true }
}

export async function deleteCredit(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('credits')
    .delete()
    .eq('id', id)

  if (error) {
    console.error("Erreur suppression credit:", error)
    return { error: error.message }
  }

  revalidatePath('/credits')
  return { success: true }
}

export async function addDecaissementCredit(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Non authentifié")

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('gie_id')
    .eq('id', user.id)
    .single()
    
  if (!userData) throw new Error("Utilisateur introuvable")

  const data = {
    gie_id: userData.gie_id,
    credit_id: formData.get('credit_id'),
    compte_id: formData.get('compte_id'),
    type_transaction: 'sortie',
    type_piece: formData.get('type_piece'), // 'facture_fournisseur' or 'retrait_espece'
    montant: parseFloat(formData.get('montant') as string) || 0,
    motif: formData.get('motif') || 'Décaissement sur crédit',
  }

  const { error } = await supabase.from('transactions').insert([data])

  if (error) {
    console.error("Erreur ajout décaissement crédit:", error)
    return { error: error.message }
  }

  revalidatePath('/credits')
  revalidatePath('/tresorerie')
  return { success: true }
}
