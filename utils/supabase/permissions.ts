import { getTenantContext } from './tenant'
import { hasPermission, type PermissionAction } from '@/lib/permissions'

// À appeler en tête des server actions d'écriture :
//   const denied = await requirePermission('membres', 'create'); if (denied) return denied
export async function requirePermission(moduleKey: string, action: PermissionAction): Promise<{ error: string } | null> {
  const tenant = await getTenantContext()
  if (!tenant) return { error: 'Non authentifié' }
  if (!hasPermission(tenant.role, tenant.permissions, moduleKey, action)) {
    return { error: "Vous n'avez pas la permission d'effectuer cette action." }
  }
  return null
}
