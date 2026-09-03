import { getFacturesPourRemboursement } from './actions'
import RemboursementsClient from './RemboursementsClient'

export default async function RemboursementsPage() {
  const { factures, error } = await getFacturesPourRemboursement()

  if (error) {
    return <div className="p-4 bg-danger/10 text-danger rounded-md">Erreur: {error}</div>
  }

  return <RemboursementsClient factures={factures || []} />
}
