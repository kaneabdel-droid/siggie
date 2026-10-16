import { getFacturesPourRemboursement } from './actions'
import RemboursementsClient from './RemboursementsClient'
import { getDictionary, getLocale } from '@/dictionaries'
import { createClient } from '@/utils/supabase/server'
import { getTenantContext } from '@/utils/supabase/tenant'

export default async function RemboursementsPage() {
  const supabase = await createClient()
  const [{ factures, error }, { data: comptes }, tenant, locale] = await Promise.all([
    getFacturesPourRemboursement(),
    supabase.from('comptes').select('id, nom').order('nom', { ascending: true }),
    getTenantContext(),
    getLocale(),
  ])
  const dict = await getDictionary(locale)
  const gieName = tenant?.gieName || 'Mon GIE'

  if (error) {
    return <div className="p-4 bg-danger/10 text-danger rounded-md">Erreur: {error}</div>
  }

  return <RemboursementsClient factures={factures || []} comptes={comptes || []} dict={dict} locale={locale} gieName={gieName} />
}
