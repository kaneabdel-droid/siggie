'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function upgradeSubscription(newPlan: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Non autorisé")
  }

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('gie_id')
    .eq('id', user.id)
    .single()

  if (!userData?.gie_id) {
    throw new Error("GIE introuvable")
  }

  const { error } = await supabase
    .from('gies')
    .update({ subscription_tier: newPlan })
    .eq('id', userData.gie_id)

  if (error) {
    console.error("Erreur de mise à jour abonnement", error)
    throw new Error("Erreur de mise à jour de l'abonnement")
  }

  revalidatePath('/dashboard')
  revalidatePath('/abonnement')
}
