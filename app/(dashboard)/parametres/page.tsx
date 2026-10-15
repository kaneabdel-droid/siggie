import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getTenantContext } from '@/utils/supabase/tenant'
import { getDictionary, getLocale } from '@/dictionaries'
import ParametresForm from './ParametresForm'
import CollaborateursSection, { type CollaborateurItem } from './CollaborateursSection'
import type { PermissionMap } from '@/lib/permissions'

export default async function ParametresPage() {
  const tenant = await getTenantContext()
  if (!tenant) redirect('/login')

  const supabase = await createClient()
  const dict = await getDictionary(await getLocale())
  const t = dict.parametres

  const { data: gie } = await supabase
    .from('gies')
    .select('nom, adresse, telephone, email, identification, devise, logo_url')
    .eq('id', tenant.gieId)
    .single()

  let collaborateurs: CollaborateurItem[] = []

  if (tenant.role === 'admin') {
    const { data: usersData } = await supabase
      .from('utilisateurs')
      .select('id, role, permissions, identifiant, telephone, nom_complet')
      .eq('gie_id', tenant.gieId)

    const adminSupabase = createAdminClient()
    const { data: authUsers } = await adminSupabase.auth.admin.listUsers({ perPage: 1000 })
    const emailById = new Map(authUsers?.users.map((u) => [u.id, u.email ?? null]) ?? [])

    collaborateurs = (usersData ?? []).map((u) => ({
      id: u.id,
      role: u.role,
      permissions: (u.permissions as PermissionMap | null) ?? null,
      identifiant: u.identifiant,
      telephone: u.telephone,
      nom_complet: u.nom_complet,
      email: emailById.get(u.id) ?? null,
    }))
  }

  return (
    <div>
      <h1 className="text-2xl font-bold font-heading text-foreground mb-2">{t.title}</h1>
      <p className="text-sm text-foreground-muted mb-8">{t.subtitle}</p>

      <ParametresForm
        dict={dict}
        gie={{
          nom: gie?.nom ?? '',
          adresse: gie?.adresse ?? '',
          telephone: gie?.telephone ?? '',
          email: gie?.email ?? '',
          identification: gie?.identification ?? '',
          devise: gie?.devise ?? 'XOF',
          logoUrl: gie?.logo_url ?? null,
        }}
      />

      {tenant.role === 'admin' && (
        <CollaborateursSection
          collaborateurs={collaborateurs}
          currentUserId={tenant.userId}
        />
      )}
    </div>
  )
}

