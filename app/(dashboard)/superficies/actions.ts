'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { getTenantContext } from '@/utils/supabase/tenant'

export async function updateValidationSuperficie(
  campagneId: string,
  membreId: string,
  formData: FormData
) {
  const tenant = await getTenantContext()
  if (tenant && tenant.subscriptionTier !== 'premium') {
    return { error: "La validation des superficies est réservée aux abonnés de la formule Premium." }
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Non authentifié' }
  }

  const rawSuperficieValidee = formData.get('superficie_validee')
  const casier = formData.get('casier')?.toString()?.trim() || null
  const statutValidation = formData.get('statut_validation')?.toString() || 'valide'
  const dateControle = formData.get('date_controle')?.toString() || new Date().toISOString().split('T')[0]
  const controleur = formData.get('controleur')?.toString()?.trim() || null
  const observations = formData.get('observations')?.toString()?.trim() || null

  const superficieValidee = rawSuperficieValidee !== null && rawSuperficieValidee !== ''
    ? parseFloat(rawSuperficieValidee.toString())
    : null

  const { error } = await supabase
    .from('campagne_membres')
    .update({
      superficie_validee: superficieValidee,
      casier: casier,
      statut_validation: statutValidation,
      date_controle: dateControle,
      controleur: controleur,
      observations: observations,
      valide_at: new Date().toISOString(),
      valide_par: user.id,
    })
    .match({ campagne_id: campagneId, membre_id: membreId })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/superficies')
  revalidatePath('/campagnes')
  return { success: true }
}

export async function validerToutConforme(campagneId: string, controleurNom: string) {
  const tenant = await getTenantContext()
  if (tenant && tenant.subscriptionTier !== 'premium') {
    return { error: "La validation des superficies est réservée aux abonnés de la formule Premium." }
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Non authentifié' }
  }

  // Fetch pending members for this campaign
  const { data: records, error: fetchErr } = await supabase
    .from('campagne_membres')
    .select('campagne_id, membre_id, superficie')
    .eq('campagne_id', campagneId)
    .or('statut_validation.is.null,statut_validation.eq.en_attente,statut_validation.eq.litige')

  if (fetchErr) {
    return { error: fetchErr.message }
  }

  if (!records || records.length === 0) {
    return { success: true, count: 0 }
  }

  const today = new Date().toISOString().split('T')[0]
  const now = new Date().toISOString()

  for (const r of records) {
    await supabase
      .from('campagne_membres')
      .update({
        superficie_validee: r.superficie || 0,
        statut_validation: 'valide',
        date_controle: today,
        controleur: controleurNom || 'Chef d\'exploitation',
        valide_at: now,
        valide_par: user.id,
      })
      .match({ campagne_id: r.campagne_id, membre_id: r.membre_id })
  }

  revalidatePath('/superficies')
  revalidatePath('/campagnes')
  return { success: true, count: records.length }
}

export async function reinitialiserValidation(campagneId: string, membreId: string) {
  const tenant = await getTenantContext()
  if (tenant && tenant.subscriptionTier !== 'premium') {
    return { error: "La validation des superficies est réservée aux abonnés de la formule Premium." }
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Non authentifié' }
  }

  const { error } = await supabase
    .from('campagne_membres')
    .update({
      superficie_validee: null,
      statut_validation: 'en_attente',
      date_controle: null,
      observations: null,
      valide_at: null,
      valide_par: null,
    })
    .match({ campagne_id: campagneId, membre_id: membreId })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/superficies')
  revalidatePath('/campagnes')
  return { success: true }
}
