import { getFactures } from './actions'
import FacturationClient from './FacturationClient'
import { getDictionary, getLocale } from '@/dictionaries'

export default async function FacturationPage() {
  const { factures, error } = await getFactures()
  const locale = await getLocale()
  const dict = await getDictionary(locale)

  if (error) {
    return <div className="p-4 bg-danger/10 text-danger rounded-md">Erreur: {error}</div>
  }

  return <FacturationClient factures={factures || []} dict={dict} locale={locale} />
}
