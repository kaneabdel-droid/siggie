import { createClient } from '@/utils/supabase/server'
import { Package, TrendingUp, TrendingDown } from 'lucide-react'
import CreateIntrantButton from './CreateIntrantButton'
import AchatIntrantButton from './AchatIntrantButton'
import IntrantRowActions from './IntrantRowActions'
import SearchIntrants from './SearchIntrants'

export default async function IntrantsPage({
  searchParams,
}: {
  searchParams?: Promise<{ query?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams
  const query = params?.query || ''

  // Fetch intrants for the current GIE
  let queryBuilder = supabase
    .from('intrants')
    .select('*')
    .order('nom', { ascending: true })

  if (query) {
    queryBuilder = queryBuilder.or(`nom.ilike.%${query}%,type_intrant.ilike.%${query}%`)
  }

  const { data: intrants, error } = await queryBuilder

  // Calculs des KPIs
  const totalValue = intrants?.reduce((sum, intrant) => sum + (intrant.quantite_stock * intrant.prix_unitaire), 0) || 0

  // Total des distributions pour les campagnes en cours
  const { data: campagnesEnCours } = await supabase
    .from('campagnes')
    .select('id')
    .eq('statut', 'en_cours')

  let totalDistributions = 0
  if (campagnesEnCours && campagnesEnCours.length > 0 && intrants && intrants.length > 0) {
    const activeCampagneIds = campagnesEnCours.map(c => c.id)
    const intrantIds = intrants.map(i => i.id)
    const { data: distributions } = await supabase
      .from('distribution_intrants')
      .select('quantite')
      .in('campagne_id', activeCampagneIds)
      .in('intrant_id', intrantIds)
    
    totalDistributions = distributions?.reduce((sum, dist) => sum + Number(dist.quantite), 0) || 0
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h2 className="text-2xl font-bold font-heading text-foreground">Intrants & Stock</h2>
          <p className="mt-2 text-sm text-foreground-muted">
            Gérez votre catalogue d'intrants, suivez les achats, les distributions et l'état des stocks en temps réel.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 flex gap-3 sm:flex-none">
          <AchatIntrantButton intrants={intrants || []} />
          <CreateIntrantButton />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="overflow-hidden rounded-lg bg-surface px-4 py-5 shadow sm:p-6 border border-surface-border flex items-center gap-4">
          <div className="rounded-md bg-primary/20 p-3 shrink-0">
            <Package className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <dt className="truncate text-sm font-medium text-foreground-muted">Valeur Totale du Stock</dt>
            <dd className="mt-1 text-2xl font-semibold tracking-tight text-foreground truncate">{totalValue.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA</dd>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg bg-surface px-4 py-5 shadow sm:p-6 border border-surface-border flex items-center gap-4">
          <div className="rounded-md bg-danger/20 p-3 shrink-0">
            <TrendingDown className="h-6 w-6 text-danger" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <dt className="truncate text-sm font-medium text-foreground-muted">Distributions (Campagne en cours)</dt>
            <dd className="mt-1 text-2xl font-semibold tracking-tight text-foreground truncate">{totalDistributions.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} Unités</dd>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg bg-surface px-4 py-5 shadow sm:p-6 border border-surface-border flex items-center gap-4">
          <div className="rounded-md bg-secondary/20 p-3 shrink-0">
            <TrendingUp className="h-6 w-6 text-secondary" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <dt className="truncate text-sm font-medium text-foreground-muted">Remboursements en Nature</dt>
            <dd className="mt-1 text-2xl font-semibold tracking-tight text-foreground truncate">- kg</dd>
          </div>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="mt-8 flex items-center space-x-4">
        <SearchIntrants />
      </div>

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden overflow-x-auto shadow ring-1 ring-surface-border sm:rounded-lg bg-surface">
              <table className="min-w-full divide-y divide-surface-border">
                <thead className="bg-background/50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-foreground sm:pl-6">Intrant</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">Type</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">Détails</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">Fournisseur</th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-foreground">Prix Unitaire</th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-foreground">En Stock</th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border bg-surface">
                  {intrants && intrants.length > 0 ? (
                    intrants.map((intrant) => (
                      <tr key={intrant.id} className="hover:bg-background/50 transition-colors">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-foreground sm:pl-6">{intrant.nom}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground-muted">
                          <span className="inline-flex items-center capitalize rounded-md px-2 py-1 text-xs font-medium bg-surface-border text-foreground">
                            {intrant.type_intrant}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground-muted">{intrant.description || '-'}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground-muted">{intrant.fournisseur || '-'}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground-muted text-right font-medium">{intrant.prix_unitaire.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-right">
                          <span className={`font-semibold ${intrant.quantite_stock < 100 ? 'text-danger' : 'text-primary'}`}>
                            {intrant.quantite_stock}
                          </span>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <IntrantRowActions intrant={intrant} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="whitespace-nowrap py-8 text-center text-sm text-foreground-muted">
                        Aucun intrant trouvé. Cliquez sur "Nouvel Intrant" pour alimenter votre catalogue.
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
