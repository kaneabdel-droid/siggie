import { createClient } from '@/utils/supabase/server'
import { getDictionary, getLocale } from '@/dictionaries'
import ReleveMembreClient from './ReleveMembreClient'

export default async function ReleveMembrePage() {
  const supabase = await createClient()
  const locale = await getLocale()
  const dict = await getDictionary(locale)

  const { data: membres } = await supabase
    .from('membres')
    .select('id, prenom, nom, code_membre')
    .order('prenom', { ascending: true })

  return <ReleveMembreClient membres={membres || []} dict={dict} locale={locale} />
}
