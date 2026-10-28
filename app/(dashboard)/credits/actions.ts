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

  const typeCredit = ((formData.get('type_credit') as string) || 'campagne') as 'campagne' | 'equipement'
  const equipementNom = (formData.get('equipement_nom') as string)?.trim() || null
  const rawCampagneId = formData.get('campagne_id') as string | null
  const campagneId = rawCampagneId && rawCampagneId.trim() !== '' ? rawCampagneId : null
  const banqueNom = (formData.get('banque_nom') as string)?.trim() || null
  const montantDemande = parseFloat(formData.get('montant_demande') as string) || 0
  const rawBut = (formData.get('but_credit') as string)?.trim() || ''
  const typeFinancement = (formData.get('type_financement') as string) || 'global'
  const periodicite = (formData.get('periodicite_remboursement') as string) || 'annuelle'
  const dureeCredit = parseInt(formData.get('duree_credit') as string, 10) || (typeCredit === 'equipement' ? 36 : 12)
  const tauxInteret = parseFloat(formData.get('taux_interet') as string) || 0
  const nombreEcheances = parseInt(formData.get('nombre_echeances') as string, 10) || (typeCredit === 'equipement' ? Math.max(1, Math.round(dureeCredit / 12)) : 1)
  const montantEcheance = parseFloat(formData.get('montant_echeance') as string) || 0

  // Tag de méta-données pour compatibilité absolue
  const metaTag = `[TYPE:${typeCredit}]${equipementNom ? ` [EQUIPEMENT:${equipementNom}]` : ''} [PERIODICITE:${periodicite}]`
  const butCreditWithMeta = rawBut ? `${metaTag} ${rawBut}` : metaTag

  const fullData: any = {
    gie_id: userData.gie_id,
    campagne_id: campagneId,
    banque_nom: banqueNom,
    montant_demande: montantDemande,
    but_credit: butCreditWithMeta,
    type_financement: typeFinancement,
    type_credit: typeCredit,
    equipement_nom: equipementNom,
    periodicite_remboursement: periodicite,
    duree_credit: dureeCredit,
    taux_interet: tauxInteret,
    nombre_echeances: nombreEcheances,
    montant_echeance: montantEcheance,
  }

  // 1. Essai d'insertion avec les nouvelles colonnes
  const { error: insertError } = await supabase.from('credits').insert([fullData])

  if (insertError) {
    const isSchemaError =
      insertError.code === '42703' ||
      insertError.code === 'PGRST204' ||
      insertError.message?.toLowerCase().includes('schema cache') ||
      insertError.message?.toLowerCase().includes('could not find') ||
      insertError.message?.toLowerCase().includes('column') ||
      insertError.message?.toLowerCase().includes('does not exist')

    if (isSchemaError) {
      const fallbackData: any = {
        gie_id: userData.gie_id,
        campagne_id: campagneId,
        banque_nom: banqueNom,
        montant_demande: montantDemande,
        but_credit: butCreditWithMeta,
        type_financement: typeFinancement,
        duree_credit: dureeCredit,
        taux_interet: tauxInteret,
      }
      const { error: fbErr } = await supabase.from('credits').insert([fallbackData])
      if (fbErr) {
        console.error("Erreur ajout credit (repli):", fbErr)
        return { error: fbErr.message }
      }
    } else {
      console.error("Erreur ajout credit:", insertError)
      return { error: insertError.message }
    }
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
  type_financement?: string,
  extra?: {
    type_credit?: string
    equipement_nom?: string
    periodicite_remboursement?: string
    nombre_echeances?: number
    montant_echeance?: number
  }
) {
  const denied = await requirePermission('credits', 'update')
  if (denied) return denied as never
  const supabase = await createClient()

  const data: any = { statut }
  if (montant_accorde !== undefined) data.montant_accorde = montant_accorde
  if (taux_interet !== undefined) data.taux_interet = taux_interet
  if (duree_credit !== undefined) data.duree_credit = duree_credit
  if (type_financement !== undefined) data.type_financement = type_financement

  if (extra?.type_credit !== undefined) data.type_credit = extra.type_credit
  if (extra?.equipement_nom !== undefined) data.equipement_nom = extra.equipement_nom
  if (extra?.periodicite_remboursement !== undefined) data.periodicite_remboursement = extra.periodicite_remboursement
  if (extra?.nombre_echeances !== undefined) data.nombre_echeances = extra.nombre_echeances
  if (extra?.montant_echeance !== undefined) data.montant_echeance = extra.montant_echeance

  const { error } = await supabase
    .from('credits')
    .update(data)
    .eq('id', id)

  if (error) {
    const isSchemaError =
      error.code === '42703' ||
      error.code === 'PGRST204' ||
      error.message?.toLowerCase().includes('schema cache') ||
      error.message?.toLowerCase().includes('could not find') ||
      error.message?.toLowerCase().includes('column') ||
      error.message?.toLowerCase().includes('does not exist')

    if (isSchemaError) {
      // Retirer les colonnes non encore migrées
      delete data.type_credit
      delete data.equipement_nom
      delete data.periodicite_remboursement
      delete data.nombre_echeances
      delete data.montant_echeance

      // Si extra a été fourni, encoder dans but_credit pour conserver les métadonnées
      if (extra?.type_credit || extra?.equipement_nom) {
        try {
          const { data: existingCredit } = await supabase.from('credits').select('but_credit').eq('id', id).single()
          const metaTag = `[TYPE:${extra.type_credit || 'equipement'}]${extra.equipement_nom ? ` [EQUIPEMENT:${extra.equipement_nom}]` : ''} [PERIODICITE:${extra.periodicite_remboursement || 'annuelle'}]`
          const cleanOld = (existingCredit?.but_credit || '')
            .replace(/\[TYPE:[^\]]+\]/g, '')
            .replace(/\[EQUIPEMENT:[^\]]*\]/g, '')
            .replace(/\[PERIODICITE:[^\]]*\]/g, '')
            .trim()
          data.but_credit = cleanOld ? `${metaTag} ${cleanOld}` : metaTag
        } catch (_) {}
      }

      const { error: err2 } = await supabase.from('credits').update(data).eq('id', id)
      if (err2) {
        console.error("Erreur modification statut credit (repli):", err2)
        return { error: err2.message }
      }
    } else {
      console.error("Erreur modification statut credit:", error)
      return { error: error.message }
    }
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

