import { getMateriels } from '../actions'
import AmortissementsClient from './AmortissementsClient'
import { getDictionary, getLocale } from '@/dictionaries'

export default async function AmortissementsPage() {
  const { materiels, error } = await getMateriels()
  const locale = await getLocale()
  const dict = await getDictionary(locale)

  if (error) {
    return <div className="p-4 bg-danger/10 text-danger rounded-md">Erreur: {error}</div>
  }

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold leading-7 text-foreground">{dict.materiel_pages.amortissements.title}</h3>
          <p className="mt-1 text-sm text-foreground-muted">
            {dict.materiel_pages.amortissements.desc}
          </p>
        </div>
      </div>

      <AmortissementsClient materiels={materiels || []} dict={dict} locale={locale} />
    </div>
  )
}
