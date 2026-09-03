import { getPrestations, getMateriels } from '../actions'
import AddPrestationModal from './AddPrestationModal'
import PrestationsClient from './PrestationsClient'

export default async function PrestationsPage() {
  const { prestations, error } = await getPrestations()
  const { materiels } = await getMateriels() // Pour le dropdown du formulaire

  if (error) {
    return <div className="p-4 bg-danger/10 text-danger rounded-md">Erreur: {error}</div>
  }

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold leading-7 text-foreground">Historique des Prestations</h3>
          <p className="mt-1 text-sm text-foreground-muted">
            Travaux réalisés par vos équipements générant des recettes.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <AddPrestationModal materiels={materiels || []} />
        </div>
      </div>

      <PrestationsClient prestations={prestations || []} materiels={materiels || []} />
    </div>
  )
}
