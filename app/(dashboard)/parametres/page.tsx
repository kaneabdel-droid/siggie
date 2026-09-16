import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getTenantContext } from '@/utils/supabase/tenant'
import ParametresForm from './ParametresForm'

export default async function ParametresPage() {
  const tenant = await getTenantContext()
  if (!tenant) redirect('/login')

  const supabase = await createClient()
  const { data: gie } = await supabase
    .from('gies')
    .select('nom, adresse, telephone, email, identification, devise, logo_url')
    .eq('id', tenant.gieId)
    .single()

  return (
    <div>
      <h1 className="text-2xl font-bold font-heading text-foreground mb-2">Paramètres</h1>
      <p className="text-sm text-foreground-muted mb-8">
        Informations du GIE, affichées sur les documents imprimés (factures, reçus).
      </p>

      <ParametresForm
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
    </div>
  )
}
