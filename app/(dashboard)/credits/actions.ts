'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/utils/supabase/permissions'

export async function addCredit(formData: FormData) {
  const denied = await requirePermission('credits', 'create')
  if (denied) return denied as never
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
    type_financement: (formData.get('type_financement') as string) || 'global',
  }

  const { error } = await supabase.from('credits').insert([data])

  if (error) {
    console.error("Erreur ajout credit:", error)
    return { error: error.message }
  }

  revalidatePath('/credits')
  return { success: true }
}

export async function updateCreditStatus(
  id: string,
  statut: string,
  montant_accorde?: number,
  taux_interet?: number,
  duree_credit?: number,
  type_financement?: string
) {
  const denied = await requirePermission('credits', 'update')
  if (denied) return denied as never
  const supabase = await createClient()

  const data: any = { statut }
  if (montant_accorde !== undefined) {
    data.montant_accorde = montant_accorde
  }
  if (taux_interet !== undefined) {
    data.taux_interet = taux_interet
  }
  if (duree_credit !== undefined) {
    data.duree_credit = duree_credit
  }
  if (type_financement !== undefined) {
    data.type_financement = type_financement
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
  const denied = await requirePermission('credits', 'delete')
  if (denied) return denied as never
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
  const denied = await requirePermission('credits', 'update')
  if (denied) return denied as never
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

export async function addRemboursementCredit(formData: FormData) {
  const denied = await requirePermission('credits', 'update')
  if (denied) return denied as never
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
    type_piece: 'remboursement_credit',
    montant: parseFloat(formData.get('montant') as string) || 0,
    motif: formData.get('motif') || 'Remboursement de crédit',
  }

  const { error } = await supabase.from('transactions').insert([data])

  if (error) {
    console.error("Erreur ajout remboursement crédit:", error)
    return { error: error.message }
  }

  revalidatePath('/credits')
  revalidatePath('/tresorerie')
  return { success: true }
}

export async function updateCreditTypeFinancement(creditId: string, type_financement: string) {
  const denied = await requirePermission('credits', 'update')
  if (denied) return denied as never
  const supabase = await createClient()

  const { error } = await supabase
    .from('credits')
    .update({ type_financement })
    .eq('id', creditId)

  if (error) {
    console.error("Erreur modification type_financement:", error)
    return { error: error.message }
  }

  revalidatePath('/credits')
  revalidatePath(`/credits/${creditId}`)
  return { success: true }
}

export async function addCreditLigne(formData: FormData) {
  const denied = await requirePermission('credits', 'update')
  if (denied) return denied as never
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Non authentifié")

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('gie_id')
    .eq('id', user.id)
    .single()

  if (!userData) throw new Error("Utilisateur introuvable")

  const creditId = formData.get('credit_id') as string
  const designation = (formData.get('designation') as string)?.trim()
  const montantAccorde = parseFloat(formData.get('montant_accorde') as string) || 0
  const montantPaye = parseFloat(formData.get('montant_paye') as string) || 0

  if (!designation) {
    return { error: "La désignation de l'intrant ou service est obligatoire." }
  }

  const data = {
    gie_id: userData.gie_id,
    credit_id: creditId,
    intrant_id: formData.get('intrant_id') || null,
    type_rubrique: (formData.get('type_rubrique') as string) || 'intrant',
    designation,
    fournisseur_nom: (formData.get('fournisseur_nom') as string)?.trim() || null,
    montant_accorde: montantAccorde,
    montant_paye: montantPaye,
    observations: (formData.get('observations') as string)?.trim() || null,
  }

  const { error } = await supabase.from('credit_lignes').insert([data])

  if (error) {
    console.error("Erreur ajout ligne crédit:", error)
    return { error: error.message }
  }

  revalidatePath('/credits')
  revalidatePath(`/credits/${creditId}`)
  return { success: true }
}

export async function updateCreditLigne(id: string, formData: FormData) {
  const denied = await requirePermission('credits', 'update')
  if (denied) return denied as never
  const supabase = await createClient()

  const creditId = formData.get('credit_id') as string
  const designation = (formData.get('designation') as string)?.trim()
  const montantAccorde = parseFloat(formData.get('montant_accorde') as string) || 0
  const montantPaye = parseFloat(formData.get('montant_paye') as string) || 0

  if (!designation) {
    return { error: "La désignation de l'intrant ou service est obligatoire." }
  }

  const data: any = {
    intrant_id: formData.get('intrant_id') || null,
    type_rubrique: (formData.get('type_rubrique') as string) || 'intrant',
    designation,
    fournisseur_nom: (formData.get('fournisseur_nom') as string)?.trim() || null,
    montant_accorde: montantAccorde,
    montant_paye: montantPaye,
    observations: (formData.get('observations') as string)?.trim() || null,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase.from('credit_lignes').update(data).eq('id', id)

  if (error) {
    console.error("Erreur modification ligne crédit:", error)
    return { error: error.message }
  }

  revalidatePath('/credits')
  if (creditId) revalidatePath(`/credits/${creditId}`)
  return { success: true }
}

export async function updateCreditLignePaiement(id: string, montantPaye: number, creditId?: string) {
  const denied = await requirePermission('credits', 'update')
  if (denied) return denied as never
  const supabase = await createClient()

  const { error } = await supabase
    .from('credit_lignes')
    .update({
      montant_paye: montantPaye,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error("Erreur mise à jour montant payé:", error)
    return { error: error.message }
  }

  revalidatePath('/credits')
  if (creditId) revalidatePath(`/credits/${creditId}`)
  return { success: true }
}

export async function deleteCreditLigne(id: string, creditId: string) {
  const denied = await requirePermission('credits', 'delete')
  if (denied) return denied as never
  const supabase = await createClient()

  const { error } = await supabase.from('credit_lignes').delete().eq('id', id)

  if (error) {
    console.error("Erreur suppression ligne crédit:", error)
    return { error: error.message }
  }

  revalidatePath('/credits')
  revalidatePath(`/credits/${creditId}`)
  return { success: true }
}

