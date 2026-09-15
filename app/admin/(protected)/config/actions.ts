'use server'

import { revalidatePath } from 'next/cache'
import { getSharedAdminUser } from '@/utils/supabase/admin-identity'
import { createAdminClient } from '@/utils/supabase/admin'
import { isAdminEmail } from '@/lib/admin/auth'

export async function upsertChariowProduit(montant: number, productId: string) {
  const user = await getSharedAdminUser()
  if (!isAdminEmail(user?.email)) {
    return { error: 'Non autorisé' }
  }

  if (!montant || !productId.trim()) {
    return { error: 'Montant et identifiant produit requis' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('chariow_produits')
    .upsert({ montant, product_id: productId.trim(), updated_at: new Date().toISOString() })

  if (error) return { error: error.message }

  revalidatePath('/admin/config')
  return { success: true }
}

export async function supprimerChariowProduit(montant: number) {
  const user = await getSharedAdminUser()
  if (!isAdminEmail(user?.email)) {
    return { error: 'Non autorisé' }
  }

  const admin = createAdminClient()
  const { error } = await admin.from('chariow_produits').delete().eq('montant', montant)
  if (error) return { error: error.message }

  revalidatePath('/admin/config')
  return { success: true }
}
