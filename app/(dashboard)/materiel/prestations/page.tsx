import { getPrestations, getMateriels } from '../actions'
import AddPrestationModal from './AddPrestationModal'
import PrestationsClient from './PrestationsClient'
import { getDictionary, getLocale } from '@/dictionaries'

export default async function PrestationsPage() {
  const { prestations, error } = await getPrestations()
  const { materiels } = await getMateriels() // Pour le dropdown du formulaire
  const locale = await getLocale()
  const dict = await getDictionary(locale)

  if (error) {
    return <div className="p-4 bg-danger/10 text-danger rounded-md">Erreur: {error}</div>
  }

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold leading-7 text-foreground">{dict.materiel_pages.prestations.title}</h3>
          <p className="mt-1 text-sm text-foreground-muted">
            {dict.materiel_pages.prestations.desc}
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <AddPrestationModal materiels={materiels || []} dict={dict} />
        </div>
      </div>

      <PrestationsClient prestations={prestations || []} materiels={materiels || []} dict={dict} locale={locale} />
    </div>
  )
}
