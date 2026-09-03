import { getConsommations, getMateriels } from '../actions'
import AddConsommationModal from './AddConsommationModal'
import ConsommationsClient from './ConsommationsClient'

export default async function ConsommationsPage() {
  const { consommations, error } = await getConsommations()
  const { materiels } = await getMateriels() // Pour le dropdown du formulaire

  if (error) {
    return <div className="p-4 bg-danger/10 text-danger rounded-md">Erreur: {error}</div>
  }

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold leading-7 text-foreground">Dépenses et Consommations</h3>
          <p className="mt-1 text-sm text-foreground-muted">
            Suivez les frais d'entretien, de carburant et de pièces pour chaque équipement.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <AddConsommationModal materiels={materiels || []} />
        </div>
      </div>

      <ConsommationsClient consommations={consommations || []} materiels={materiels || []} />
    </div>
  )
}
