import { getFacturesPourRemboursement } from './actions'
import RemboursementsClient from './RemboursementsClient'
import { getDictionary, getLocale } from '@/dictionaries'

export default async function RemboursementsPage() {
  const { factures, error } = await getFacturesPourRemboursement()
  const locale = await getLocale()
  const dict = await getDictionary(locale)

  if (error) {
    return <div className="p-4 bg-danger/10 text-danger rounded-md">Erreur: {error}</div>
  }

  return <RemboursementsClient factures={factures || []} dict={dict} locale={locale} />
}
