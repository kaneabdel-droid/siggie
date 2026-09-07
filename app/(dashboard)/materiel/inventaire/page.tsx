import { getMateriels } from '../actions'
import AddMaterielModal from '../AddMaterielModal'
import MaterielClient from '../MaterielClient'
import { getDictionary, getLocale } from '@/dictionaries'

export default async function MaterielPage() {
  const { materiels, error } = await getMateriels()
  const locale = await getLocale()
  const dict = await getDictionary(locale)

  if (error) {
    return <div className="p-4 bg-danger/10 text-danger rounded-md">Erreur: {error}</div>
  }

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-foreground sm:truncate sm:text-3xl sm:tracking-tight font-heading">
            {dict.materiel.tabs.inventaire}
          </h2>
          <p className="mt-2 text-sm text-foreground-muted">
            {dict.materiel.desc}
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <AddMaterielModal />
        </div>
      </div>

      <MaterielClient materiels={materiels || []} dict={dict.materiel.inventaire_table} />
    </div>
  )
}
