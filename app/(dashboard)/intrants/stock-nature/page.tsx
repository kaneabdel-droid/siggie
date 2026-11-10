import { createClient } from '@/utils/supabase/server'
import { getDictionary, getLocale } from '@/dictionaries'
import { getTenantContext } from '@/utils/supabase/tenant'
import StockNatureClient from '@/app/(dashboard)/remboursements/stock-nature/StockNatureClient'

export default async function IntrantsStockNaturePage() {
  const supabase = await createClient()
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const tenant = await getTenantContext()
  const t = dict?.remboursements_pages?.stock_nature || {
    title: 'Stock Produits Collectés en Nature',
    desc: 'Suivi des stocks de récoltes (paddy, maïs, arachide...) collectés lors des remboursements en nature.',
    no_campaigns: 'Aucune campagne enregistrée.'
  }

  const { data: campagnes } = await supabase
    .from('campagnes')
    .select('id, nom, statut, produit_collecte')
    .order('created_at', { ascending: false })

  const { data: membres } = await supabase
    .from('membres')
    .select('id, prenom, nom')
    .eq('statut', 'actif')
    .order('prenom', { ascending: true })

  const { data: clients } = await supabase
    .from('clients_externes')
    .select('id, nom')
    .order('nom', { ascending: true })

  if (!campagnes || campagnes.length === 0) {
    return (
      <div className="text-center py-12 text-foreground-muted bg-surface rounded-lg border border-surface-border">
        {t.no_campaigns}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-base font-semibold leading-6 text-foreground">{t.title}</h3>
        <p className="mt-1 text-sm text-foreground-muted">{t.desc}</p>
      </div>

      <StockNatureClient
        campagnes={campagnes}
        membres={membres || []}
        initialClients={clients || []}
        dict={dict}
        locale={locale}
        gieName={tenant?.gieName || 'Mon GIE'}
      />
    </div>
  )
}

