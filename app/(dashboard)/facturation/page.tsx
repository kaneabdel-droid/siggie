import { createClient } from '@/utils/supabase/server'
import { getTenantContext } from '@/utils/supabase/tenant'
import { getFactures } from './actions'
import FacturationClient from './FacturationClient'
import { getDictionary, getLocale } from '@/dictionaries'

export default async function FacturationPage() {
  const supabase = await createClient()
  const locale = await getLocale()
  const dict = await getDictionary(locale)

  const [{ factures, error }, { data: campagnes }, tenant] = await Promise.all([
    getFactures(),
    supabase.from('campagnes').select('id, nom').order('created_at', { ascending: false }),
    getTenantContext(),
  ])

  const gieName = tenant?.gieName || 'Mon GIE'

  if (error) {
    return <div className="p-4 bg-danger/10 text-danger rounded-md">Erreur: {error}</div>
  }

  return <FacturationClient factures={factures || []} campagnes={campagnes || []} dict={dict} locale={locale} gieName={gieName} />
}
