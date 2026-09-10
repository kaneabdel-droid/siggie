import { createClient } from '@/utils/supabase/server'
import { getDictionary, getLocale } from '@/dictionaries'
import StockNatureClient from './StockNatureClient'

export default async function StockNaturePage() {
  const supabase = await createClient()
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const t = dict.remboursements_pages.stock_nature

  const { data: campagnes } = await supabase
    .from('campagnes')
    .select('id, nom, statut, produit_collecte')
    .order('created_at', { ascending: false })

  const { data: membres } = await supabase
    .from('membres')
    .select('id, prenom, nom')
    .eq('statut', 'actif')
    .order('prenom', { ascending: true })

  if (!campagnes || campagnes.length === 0) {
    return (
      <div className="text-center py-12 text-foreground-muted bg-surface rounded-lg border border-surface-border">
        {t.no_campaigns}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h3 className="text-base font-semibold leading-6 text-foreground">{t.title}</h3>
        <p className="mt-2 text-sm text-foreground-muted">{t.desc}</p>
      </div>

      <StockNatureClient campagnes={campagnes} membres={membres || []} dict={dict} locale={locale} />
    </div>
  )
}
