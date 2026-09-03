import { getMateriels } from '../actions'
import AmortissementsClient from './AmortissementsClient'

export default async function AmortissementsPage() {
  const { materiels, error } = await getMateriels()

  if (error) {
    return <div className="p-4 bg-danger/10 text-danger rounded-md">Erreur: {error}</div>
  }

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold leading-7 text-foreground">Tableaux d'Amortissement</h3>
          <p className="mt-1 text-sm text-foreground-muted">
            Consultez le plan d'amortissement comptable de chaque équipement de votre parc.
          </p>
        </div>
      </div>

      <AmortissementsClient materiels={materiels || []} />
    </div>
  )
}
