import { createClient } from '@/utils/supabase/server'
import { getDictionary, getLocale } from '@/dictionaries'
import { getTenantContext } from '@/utils/supabase/tenant'
import ReleveMembreClient from './ReleveMembreClient'

export default async function ReleveMembrePage() {
  const supabase = await createClient()
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const tenant = await getTenantContext()

  const { data: membres } = await supabase
    .from('membres')
    .select('id, prenom, nom, code_membre')
    .order('prenom', { ascending: true })

  return <ReleveMembreClient membres={membres || []} dict={dict} locale={locale} gieName={tenant?.gieName || 'Mon GIE'} />
}
