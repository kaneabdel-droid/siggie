import { getFacturesPourRemboursement } from './actions'
import RemboursementsClient from './RemboursementsClient'
import { getDictionary, getLocale } from '@/dictionaries'
import { createClient } from '@/utils/supabase/server'

export default async function RemboursementsPage() {
  const { factures, error } = await getFacturesPourRemboursement()
  const supabase = await createClient()
  const { data: comptes } = await supabase.from('comptes').select('id, nom').order('nom', { ascending: true })
  const locale = await getLocale()
  const dict = await getDictionary(locale)

  if (error) {
    return <div className="p-4 bg-danger/10 text-danger rounded-md">Erreur: {error}</div>
  }

  return <RemboursementsClient factures={factures || []} comptes={comptes || []} dict={dict} locale={locale} />
}
