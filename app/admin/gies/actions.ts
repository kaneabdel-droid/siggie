'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { isAdminEmail } from '@/lib/admin/auth'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminEmail(user?.email)) {
    throw new Error('Non autorisé')
  }
}

export async function changerForfait(gieId: string, niveau: string) {
  await assertAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase.from('gies').update({ subscription_tier: niveau }).eq('id', gieId)
  if (error) return { error: error.message }

  revalidatePath(`/admin/gies/${gieId}`)
  revalidatePath('/admin/gies')
  return { success: true }
}

export async function prolongerEssai(gieId: string, jours: number) {
  await assertAdmin()
  const supabase = createAdminClient()

  const nouvelleDate = new Date(Date.now() + jours * 24 * 60 * 60 * 1000).toISOString()
  const { error } = await supabase.from('gies').update({ essai_expire_le: nouvelleDate }).eq('id', gieId)
  if (error) return { error: error.message }

  revalidatePath(`/admin/gies/${gieId}`)
  revalidatePath('/admin/gies')
  return { success: true }
}

export async function verrouillerCompte(gieId: string) {
  await assertAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase.from('gies').update({ compte_verrouille: true }).eq('id', gieId)
  if (error) return { error: error.message }

  revalidatePath(`/admin/gies/${gieId}`)
  revalidatePath('/admin/gies')
  return { success: true }
}

export async function deverrouillerCompte(gieId: string) {
  await assertAdmin()
  const supabase = createAdminClient()

  // Déverrouiller lève aussi l'horloge d'essai pour ne pas se faire reverrouiller aussitôt.
  const { error } = await supabase.from('gies').update({ compte_verrouille: false, essai_expire_le: null }).eq('id', gieId)
  if (error) return { error: error.message }

  revalidatePath(`/admin/gies/${gieId}`)
  revalidatePath('/admin/gies')
  return { success: true }
}
