import { createClient } from '@/utils/supabase/server'
import { getFactures } from './actions'
import FacturationClient from './FacturationClient'
import { getDictionary, getLocale } from '@/dictionaries'

export default async function FacturationPage() {
  const supabase = await createClient()
  const { factures, error } = await getFactures()
  const locale = await getLocale()
  const dict = await getDictionary(locale)

  const { data: campagnes } = await supabase
    .from('campagnes')
    .select('id, nom')
    .order('created_at', { ascending: false })

  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = user
    ? await supabase.from('utilisateurs').select('gies(nom)').eq('id', user.id).single()
    : { data: null }
  const gie = Array.isArray(userData?.gies) ? userData.gies[0] : userData?.gies
  const gieName = gie?.nom || 'Mon GIE'

  if (error) {
    return <div className="p-4 bg-danger/10 text-danger rounded-md">Erreur: {error}</div>
  }

  return <FacturationClient factures={factures || []} campagnes={campagnes || []} dict={dict} locale={locale} gieName={gieName} />
}
