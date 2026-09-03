import { getGlobalStats } from './actions'
import BilansClient from './BilansClient'

export default async function BilansPage() {
  const stats = await getGlobalStats()

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold leading-7 text-foreground sm:truncate sm:text-3xl sm:tracking-tight font-heading">
          Bilans & Relevés
        </h2>
        <p className="mt-2 text-sm text-foreground-muted">
          Tableau de bord récapitulatif de la santé financière et opérationnelle du GIE.
        </p>
      </div>

      <BilansClient stats={stats} />
    </div>
  )
}
