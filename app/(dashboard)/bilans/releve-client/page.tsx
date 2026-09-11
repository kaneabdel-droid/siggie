import { getClients } from './actions'
import { getDictionary, getLocale } from '@/dictionaries'
import ReleveClientClient from './ReleveClientClient'

export default async function ReleveClientPage() {
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const { clients, error } = await getClients()

  if (error) {
    return <div className="p-4 bg-danger/10 text-danger rounded-md">Erreur: {error}</div>
  }

  return <ReleveClientClient initialClients={clients || []} dict={dict} locale={locale} />
}
