'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/utils/supabase/permissions'

// Quantité totale d'un intrant à répartir entre les membres inscrits à la
// campagne (au prorata de leur superficie, voir lib/intrants/repartition.ts).
export async function updateQuantitePrevue(campagne_id: string, intrant_id: string, quantite_prevue: number) {
  const denied = await requirePermission('campagnes', 'update')
  if (denied) return denied as never
  if (!(quantite_prevue >= 0)) return { error: 'Quantité invalide.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('campagne_intrants')
    .update({ quantite_prevue })
    .match({ campagne_id, intrant_id })

  if (error) return { error: error.message }

  revalidatePath(`/campagnes/${campagne_id}/repartition`)
  revalidatePath('/distribution')
  return { success: true }
}
