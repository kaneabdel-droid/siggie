import { getFactures } from './actions'
import FacturationClient from './FacturationClient'

export default async function FacturationPage() {
  const { factures, error } = await getFactures()

  if (error) {
    return <div className="p-4 bg-danger/10 text-danger rounded-md">Erreur: {error}</div>
  }

  return <FacturationClient factures={factures || []} />
}
