import { createClient } from '@/utils/supabase/server'
import { PackageOpen, Users, BarChart3 } from 'lucide-react'
import CreateDistributionModal from './CreateDistributionModal'
import DistributionRowActions from './DistributionRowActions'
import { getDictionary, getLocale } from '@/dictionaries'

export const dynamic = 'force-dynamic'

export default async function DistributionPage() {
  const supabase = await createClient()
  const locale = await getLocale()
  const dict = await getDictionary(locale)

  // 1. Fetch campaigns (active ones)
  const { data: campagnes } = await supabase
    .from('campagnes')
    .select('id, nom')
    .in('statut', ['en_cours', 'planifiee'])
    .order('created_at', { ascending: false })

  // 2. Fetch intrants with stock > 0
  const { data: intrants } = await supabase
    .from('intrants')
    .select('id, nom, type_intrant, quantite_stock, prix_unitaire')
    .gt('quantite_stock', 0)
    .order('nom', { ascending: true })

  // 3. Fetch campagne_membres (to get members enrolled per campaign)
  const { data: campagneMembresData, error: cmError } = await supabase
    .from('campagne_membres')
    .select(`
      campagne_id,
      membres (id, prenom, nom, telephone, code_membre)
    `)
  if (cmError) console.error("Erreur Fetch CampagneMembres:", cmError)
    
  // Format for the client component
  const campagneMembres = (campagneMembresData || []).map((cm: any) => ({
    campagne_id: cm.campagne_id,
    membre: cm.membres
  }))

  // 4. Fetch campagne_intrants
  const { data: campagneIntrants } = await supabase
    .from('campagne_intrants')
    .select('campagne_id, intrant_id, prix_facturation')

  // 5. Fetch distributions history
  const { data: distributions } = await supabase
    .from('distribution_intrants')
    .select(`
      *,
      campagnes ( nom ),
      membres ( prenom, nom, code_membre ),
      intrants ( nom, type_intrant )
    `)
    .order('created_at', { ascending: false })

  // KPIs
  const totalQuantite = distributions?.reduce((sum, d) => sum + Number(d.quantite), 0) || 0
  const membresServis = new Set(distributions?.map(d => d.membre_id))
  const nombreMembresServis = membresServis.size

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h2 className="text-2xl font-bold font-heading text-foreground">{dict.distribution.title}</h2>
          <p className="mt-2 text-sm text-foreground-muted">
            {dict.distribution.desc}
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <CreateDistributionModal
            campagnes={campagnes || []}
            campagneMembres={campagneMembres}
            intrants={intrants || []}
            campagneIntrants={campagneIntrants || []}
            dict={dict}
          />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="overflow-hidden rounded-lg bg-surface px-4 py-5 shadow sm:p-6 border border-surface-border flex items-center gap-4">
          <div className="rounded-md bg-primary/20 p-3 shrink-0">
            <PackageOpen className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <dt className="truncate text-sm font-medium text-foreground-muted">{dict.distribution.kpis.total}</dt>
            <dd className="mt-1 text-2xl font-semibold tracking-tight text-foreground truncate">{totalQuantite} {dict.distribution.kpis.units}</dd>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg bg-surface px-4 py-5 shadow sm:p-6 border border-surface-border flex items-center gap-4">
          <div className="rounded-md bg-secondary/20 p-3 shrink-0">
            <Users className="h-6 w-6 text-secondary" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <dt className="truncate text-sm font-medium text-foreground-muted">{dict.distribution.kpis.members}</dt>
            <dd className="mt-1 text-2xl font-semibold tracking-tight text-foreground truncate">{nombreMembresServis}</dd>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg bg-surface px-4 py-5 shadow sm:p-6 border border-surface-border flex items-center gap-4">
          <div className="rounded-md bg-success/20 p-3 shrink-0">
            <BarChart3 className="h-6 w-6 text-success" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <dt className="truncate text-sm font-medium text-foreground-muted">{dict.distribution.kpis.operations}</dt>
            <dd className="mt-1 text-2xl font-semibold tracking-tight text-foreground truncate">{distributions?.length || 0}</dd>
          </div>
        </div>
      </div>

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden overflow-x-auto shadow ring-1 ring-surface-border sm:rounded-lg bg-surface">
              <table className="min-w-full divide-y divide-surface-border">
                <thead className="bg-background/50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-foreground sm:pl-6">{dict.distribution.table.date}</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">{dict.distribution.table.beneficiary}</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">{dict.distribution.table.product}</th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-foreground">{dict.distribution.table.quantity}</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">{dict.distribution.table.season}</th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">{dict.distribution.table.actions}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border bg-surface">
                  {distributions && distributions.length > 0 ? (
                    distributions.map((dist) => (
                      <tr key={dist.id} className="hover:bg-background/50 transition-colors">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-foreground-muted sm:pl-6">
                          {new Date(dist.date_distribution || dist.created_at).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US')}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-foreground">
                          {dist.membres ? `${dist.membres.prenom} ${dist.membres.nom}` : dict.distribution.table.unknown_member}
                          <span className="ml-2 text-xs text-foreground-muted font-normal">({dist.membres?.code_membre})</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground">
                          {dist.intrants?.nom || dict.distribution.table.deleted_product}
                          <span className="ml-2 inline-flex items-center capitalize rounded-md px-2 py-1 text-xs font-medium bg-surface-border text-foreground">
                            {dist.intrants?.type_intrant}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-right font-semibold text-primary">
                          {dist.quantite}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground-muted">
                          {dist.campagnes?.nom || '-'}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <DistributionRowActions
                            id={dist.id}
                            intrantNom={dist.intrants?.nom || 'produit'}
                            quantite={dist.quantite}
                            dict={dict}
                          />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="whitespace-nowrap py-8 text-center text-sm text-foreground-muted">
                        {dict.distribution.table.empty}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
