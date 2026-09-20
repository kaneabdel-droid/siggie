import { cache } from 'react'
import { createClient } from './server'
import type { PermissionMap } from '@/lib/permissions'

export type TenantContext = {
  userId: string
  gieId: string
  role: string
  permissions: PermissionMap | null
  gieName: string
  subscriptionTier: string
}

// Le rôle, le gie_id et l'abonnement du GIE de l'utilisateur connecté sont
// nécessaires dans le layout du dashboard ET dans plusieurs pages/layouts
// imbriqués (bilans, tresorerie, materiel, campagnes/config, facturation...)
// pour du gating par forfait. `cache()` mémorise le résultat pour la durée
// d'une seule requête serveur : peu importe combien de composants appellent
// cette fonction pendant le rendu d'une même navigation, la requête Supabase
// ne part qu'une fois au lieu d'être répétée à chaque niveau.
export const getTenantContext = cache(async (): Promise<TenantContext | null> => {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('utilisateurs')
    .select('gie_id, role, permissions, gies(nom, subscription_tier)')
    .eq('id', user.id)
    .single()

  if (!data) return null

  const gie = Array.isArray(data.gies) ? data.gies[0] : data.gies

  return {
    userId: user.id,
    gieId: data.gie_id,
    role: data.role,
    permissions: (data.permissions as PermissionMap | null) ?? null,
    gieName: gie?.nom || 'Mon GIE',
    subscriptionTier: gie?.subscription_tier || 'standard',
  }
})
