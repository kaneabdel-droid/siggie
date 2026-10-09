import { createClient } from '@/utils/supabase/server'
import { getTenantContext } from '@/utils/supabase/tenant'
import { PackageOpen, AlertTriangle } from 'lucide-react'
import CreateStockButton from './CreateStockButton'

export const metadata = {
  title: 'Gestion des Stocks | D-PHARMA',
}

export default async function StocksPage() {
  const supabase = await createClient()
  const tenant = await getTenantContext()

  // Fetch stocks
  const { data: stocks, error } = await supabase
    .from('stocks_pharmacie')
    .select(`
      id,
      quantite,
      prix_vente,
      date_peremption,
      lot,
      medicaments!inner (
        nom,
        code_barres
      )
    `)
    // .eq('gie_id', tenant?.gieId) // Protected by RLS
    .order('date_peremption', { ascending: true })

  const totalValue = (stocks || []).reduce((sum, item) => sum + (item.quantite * item.prix_vente), 0)
  
  // Date limite pour alerte péremption (ex: 90 jours)
  const limitDate = new Date()
  limitDate.setDate(limitDate.getDate() + 90)
  const expiringSoon = (stocks || []).filter(s => new Date(s.date_peremption) <= limitDate && s.quantite > 0).length

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto min-w-0">
          <h2 className="text-2xl font-bold font-heading text-foreground break-words">Gestion des Stocks</h2>
          <p className="mt-2 text-sm text-foreground-muted">
            Gérez votre inventaire, ajoutez des médicaments et surveillez les dates de péremption.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 flex flex-wrap gap-3 sm:flex-none">
          <CreateStockButton />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="overflow-hidden rounded-lg bg-surface px-4 py-5 shadow sm:p-6 border border-surface-border flex items-center gap-3">
          <div className="rounded-md bg-primary/20 p-2.5 shrink-0">
            <PackageOpen className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <dt className="text-sm font-medium text-foreground-muted">Valeur du Stock</dt>
            <dd className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{totalValue.toLocaleString('fr-FR')} FCFA</dd>
          </div>
        </div>
        
        <div className="overflow-hidden rounded-lg bg-surface px-4 py-5 shadow sm:p-6 border border-warning/50 flex items-center gap-3">
          <div className="rounded-md bg-warning/20 p-2.5 shrink-0">
            <AlertTriangle className="h-5 w-5 text-warning" />
          </div>
          <div className="min-w-0">
            <dt className="text-sm font-medium text-foreground-muted">Péremption proche (&lt; 90j)</dt>
            <dd className="mt-1 text-2xl font-semibold tracking-tight text-warning">{expiringSoon} lot(s)</dd>
          </div>
        </div>
      </div>

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-surface-border sm:rounded-lg bg-surface">
              <table className="min-w-full divide-y divide-surface-border">
                <thead className="bg-background/50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-foreground sm:pl-6">Médicament</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">Code-barres</th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-foreground">Quantité</th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-foreground">Prix Vente</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">Date Péremption</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">Lot</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border bg-surface">
                  {stocks && stocks.length > 0 ? (
                    stocks.map((item) => {
                      const isExpiring = new Date(item.date_peremption) <= limitDate
                      const isExpired = new Date(item.date_peremption) < new Date()
                      
                      return (
                        <tr key={item.id} className="hover:bg-background/50 transition-colors">
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-foreground sm:pl-6">{item.medicaments.nom}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground-muted">{item.medicaments.code_barres || '-'}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-right font-bold text-foreground">{item.quantite}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-right font-medium text-primary">{item.prix_vente.toLocaleString('fr-FR')} FCFA</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isExpired ? 'bg-danger/10 text-danger' : isExpiring ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                              {new Date(item.date_peremption).toLocaleDateString('fr-FR')}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground-muted">{item.lot || '-'}</td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="whitespace-nowrap py-8 text-center text-sm text-foreground-muted">
                        Aucun stock trouvé. Ajoutez des médicaments pour commencer.
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
