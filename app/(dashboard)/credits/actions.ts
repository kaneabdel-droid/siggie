'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/utils/supabase/permissions'
import {
  cleanButCredit,
  getCreditMaterielId,
  getCreditDateAcquisition,
  getCreditEquipementNom,
  getCreditPeriodicite,
  getCreditType,
} from '@/lib/credits-types'

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
  const isIndependant = !rawCampagneId || rawCampagneId.trim() === '' || rawCampagneId === 'independant'
  let campagneId = !isIndependant ? rawCampagneId!.trim() : null

  // Si l'utilisateur choisit "(Toutes campagnes / Indépendant)", la contrainte PostgreSQL
  // campagne_id NOT NULL exige une clé étrangère valide vers la table campagnes.
  // On rattache techniquement à la campagne en cours ou la plus récente du GIE,
  // tout en marquant le crédit comme indépendant via le méta-tag [INDEPENDANT:true].
  if (!campagneId) {
    const { data: activeCamp } = await supabase
      .from('campagnes')
      .select('id')
      .eq('gie_id', userData.gie_id)
      .order('date_debut', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (activeCamp?.id) {
      campagneId = activeCamp.id
    } else {
      // Si aucune campagne n'existe encore pour ce GIE, on en crée une générique
      const { data: newCamp } = await supabase
        .from('campagnes')
        .insert([{
          gie_id: userData.gie_id,
          nom: 'Investissements & Équipements',
          statut: 'en_cours',
          date_debut: new Date().toISOString().split('T')[0]
        }])
        .select('id')
        .single()
      campagneId = newCamp?.id || null
    }
  }

  const banqueNom = (formData.get('banque_nom') as string)?.trim() || null
  const montantDemande = parseFloat(formData.get('montant_demande') as string) || 0
  const rawBut = (formData.get('but_credit') as string)?.trim() || ''
  const typeFinancement = (formData.get('type_financement') as string) || 'global'
  const periodicite = (formData.get('periodicite_remboursement') as string) || 'annuelle'
  const dureeCredit = parseInt(formData.get('duree_credit') as string, 10) || (typeCredit === 'equipement' ? 36 : 12)
  const tauxInteret = parseFloat(formData.get('taux_interet') as string) || 0

  let matchedMaterielId = (formData.get('materiel_id') as string)?.trim() || null
  let effectiveDateAcquisition = (formData.get('date_acquisition') as string)?.trim() || null

  if (typeCredit === 'equipement') {
    // Chercher le matériel correspondant (par ID ou par nom) pour synchroniser la date d'acquisition
    let matchedMat: { id: string; nom: string; date_acquisition: string | null } | null = null
    if (matchedMaterielId) {
      const { data: matById } = await supabase
        .from('materiels')
        .select('id, nom, date_acquisition')
        .eq('gie_id', userData.gie_id)
        .eq('id', matchedMaterielId)
        .maybeSingle()
      matchedMat = matById || null
    } else if (equipementNom) {
      const { data: matByName } = await supabase
        .from('materiels')
        .select('id, nom, date_acquisition')
        .eq('gie_id', userData.gie_id)
        .ilike('nom', equipementNom)
        .limit(1)
        .maybeSingle()
      matchedMat = matByName || null
      if (matchedMat) {
        matchedMaterielId = matchedMat.id
      }
    }

    if (matchedMat) {
      if (matchedMat.date_acquisition && !effectiveDateAcquisition) {
        effectiveDateAcquisition = matchedMat.date_acquisition.slice(0, 10)
      } else if (effectiveDateAcquisition && matchedMat.date_acquisition !== effectiveDateAcquisition) {
        // Synchroniser la date d'acquisition sur la fiche matériel si elle a été renseignée/modifiée
        await supabase
          .from('materiels')
          .update({ date_acquisition: effectiveDateAcquisition })
          .eq('id', matchedMat.id)
      } else if (matchedMat.date_acquisition) {
        effectiveDateAcquisition = matchedMat.date_acquisition.slice(0, 10)
      }
    }
  }

  // Tag de méta-données pour compatibilité absolue
  const metaTag = `[TYPE:${typeCredit}]${equipementNom ? ` [EQUIPEMENT:${equipementNom}]` : ''}${matchedMaterielId ? ` [MATERIEL_ID:${matchedMaterielId}]` : ''}${effectiveDateAcquisition ? ` [DATE_ACQUISITION:${effectiveDateAcquisition}]` : ''} [PERIODICITE:${periodicite}]${isIndependant ? ' [INDEPENDANT:true]' : ''}`
  const butCreditWithMeta = rawBut ? `${metaTag} ${rawBut}` : metaTag

  const insertData: any = {
    gie_id: userData.gie_id,
    campagne_id: campagneId,
    banque_nom: banqueNom,
    montant_demande: montantDemande,
    but_credit: butCreditWithMeta,
    type_financement: typeFinancement,
    duree_credit: dureeCredit,
    taux_interet: tauxInteret,
  }

  if (typeCredit === 'equipement' && effectiveDateAcquisition) {
    insertData.date_demande = effectiveDateAcquisition
  }

  const { error: insertError } = await supabase.from('credits').insert([insertData])

  if (insertError) {
    console.error("Erreur ajout credit:", insertError)
    return { error: insertError.message }
  }

  revalidatePath('/credits')
  revalidatePath('/materiel')
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
    date_acquisition?: string
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

  if (extra?.type_credit || extra?.equipement_nom || extra?.periodicite_remboursement || extra?.date_acquisition) {
    try {
      const { data: existingCredit } = await supabase.from('credits').select('but_credit, date_demande').eq('id', id).single()
      const cleanOld = cleanButCredit(existingCredit?.but_credit)
      const isIndep = existingCredit?.but_credit?.includes('[INDEPENDANT:true]')
      const existingMatId = getCreditMaterielId(existingCredit || {})
      const effectiveDateAcq = extra.date_acquisition || getCreditDateAcquisition(existingCredit || {})
      const metaTag = `[TYPE:${extra.type_credit || 'equipement'}]${extra.equipement_nom ? ` [EQUIPEMENT:${extra.equipement_nom}]` : ''}${existingMatId ? ` [MATERIEL_ID:${existingMatId}]` : ''}${effectiveDateAcq ? ` [DATE_ACQUISITION:${effectiveDateAcq}]` : ''} [PERIODICITE:${extra.periodicite_remboursement || 'annuelle'}]${isIndep ? ' [INDEPENDANT:true]' : ''}`
      data.but_credit = cleanOld ? `${metaTag} ${cleanOld}` : metaTag
      if (effectiveDateAcq) {
        data.date_demande = effectiveDateAcq
      }
    } catch (_) { }
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
  revalidatePath(`/credits/${id}`)
  return { success: true }
}

export async function updateCreditEquipementDateAcquisition(
  creditId: string,
  dateAcquisition: string,
  materielId?: string | null
) {
  const denied = await requirePermission('credits', 'update')
  if (denied) return denied as never
  const supabase = await createClient()

  const cleanDate = dateAcquisition?.trim()
  if (!cleanDate) {
    return { error: "Veuillez saisir une date d'acquisition valide." }
  }

  const { data: existingCredit, error: fetchErr } = await supabase
    .from('credits')
    .select('*')
    .eq('id', creditId)
    .single()

  if (fetchErr || !existingCredit) {
    return { error: fetchErr?.message || 'Crédit introuvable' }
  }

  const typeCredit = getCreditType(existingCredit)
  const equipementNom = getCreditEquipementNom(existingCredit)
  const periodicite = getCreditPeriodicite(existingCredit)
  const isIndep = existingCredit.but_credit?.includes('[INDEPENDANT:true]')
  const resolvedMatId = materielId || getCreditMaterielId(existingCredit)
  const cleanOld = cleanButCredit(existingCredit.but_credit)

  const metaTag = `[TYPE:${typeCredit}]${equipementNom ? ` [EQUIPEMENT:${equipementNom}]` : ''}${resolvedMatId ? ` [MATERIEL_ID:${resolvedMatId}]` : ''} [DATE_ACQUISITION:${cleanDate}] [PERIODICITE:${periodicite}]${isIndep ? ' [INDEPENDANT:true]' : ''}`
  const butCreditWithMeta = cleanOld ? `${metaTag} ${cleanOld}` : metaTag

  const { error: updateErr } = await supabase
    .from('credits')
    .update({
      date_demande: cleanDate,
      but_credit: butCreditWithMeta,
    })
    .eq('id', creditId)

  if (updateErr) {
    return { error: updateErr.message }
  }

  // Synchroniser également la fiche matériel liée (par ID ou par nom)
  if (resolvedMatId) {
    await supabase
      .from('materiels')
      .update({ date_acquisition: cleanDate })
      .eq('id', resolvedMatId)
  } else if (equipementNom && existingCredit.gie_id) {
    await supabase
      .from('materiels')
      .update({ date_acquisition: cleanDate })
      .eq('gie_id', existingCredit.gie_id)
      .ilike('nom', equipementNom)
  }

  revalidatePath('/credits')
  revalidatePath(`/credits/${creditId}`)
  revalidatePath('/materiel')
  revalidatePath('/materiel/amortissements')
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

