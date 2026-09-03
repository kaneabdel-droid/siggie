import { getRentabiliteMateriels } from '../actions'

export default async function RentabilitePage() {
  let rentabilite = null
  let error = null
  
  try {
    const res = await getRentabiliteMateriels()
    rentabilite = res.rentabilite
  } catch (err: any) {
    error = err.message
  }

  if (error) {
    return <div className="p-4 bg-danger/10 text-danger rounded-md">Erreur: {error}</div>
  }

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount)
  }

  // Totaux globaux
  const totalRecettes = rentabilite?.reduce((sum, m) => sum + m.recettes, 0) || 0
  const totalDepenses = rentabilite?.reduce((sum, m) => sum + m.depenses, 0) || 0
  const totalAmortissements = rentabilite?.reduce((sum, m) => sum + m.amortissement_cumule, 0) || 0
  const soldeGlobal = totalRecettes - totalDepenses
  const rentabiliteNette = soldeGlobal - totalAmortissements

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold leading-7 text-foreground">Rentabilité du Parc Matériel</h3>
          <p className="mt-1 text-sm text-foreground-muted">
            Analyse financière (Recettes - Dépenses - Amortissement) par équipement.
          </p>
        </div>
      </div>

      {/* Résumé Global */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-surface p-4 rounded-lg border border-surface-border shadow-sm">
          <p className="text-sm font-medium text-foreground-muted">Total Recettes</p>
          <p className="mt-2 text-2xl font-bold text-success">{formatMoney(totalRecettes)}</p>
        </div>
        <div className="bg-surface p-4 rounded-lg border border-surface-border shadow-sm">
          <p className="text-sm font-medium text-foreground-muted">Total Dépenses</p>
          <p className="mt-2 text-2xl font-bold text-danger">{formatMoney(totalDepenses)}</p>
        </div>
        <div className="bg-surface p-4 rounded-lg border border-surface-border shadow-sm">
          <p className="text-sm font-medium text-foreground-muted">Solde Brut (Tréso.)</p>
          <p className={`mt-2 text-2xl font-bold ${soldeGlobal >= 0 ? 'text-success' : 'text-danger'}`}>
            {formatMoney(soldeGlobal)}
          </p>
        </div>
        <div className="bg-surface p-4 rounded-lg border border-surface-border shadow-sm ring-1 ring-primary/20">
          <p className="text-sm font-medium text-foreground-muted flex items-center justify-between">
            Rentabilité Nette
            <span className="text-[10px] bg-background px-2 py-0.5 rounded-full border border-surface-border">Inclut amort.</span>
          </p>
          <p className={`mt-2 text-2xl font-bold ${rentabiliteNette >= 0 ? 'text-primary' : 'text-danger'}`}>
            {formatMoney(rentabiliteNette)}
          </p>
        </div>
      </div>

      {/* Tableau détaillé par machine */}
      <div className="overflow-x-auto rounded-lg border border-surface-border bg-surface shadow mt-8">
        <table className="min-w-full divide-y divide-surface-border">
          <thead className="bg-background">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">Équipement</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">Recettes (Prest.)</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">Dépenses (Consom.)</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">Solde Brut</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">Amortissement Cumulé</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-foreground uppercase tracking-wider">Résultat Net</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border bg-surface">
            {rentabilite?.map((mat) => (
              <tr key={mat.id} className="hover:bg-surface-hover transition-colors">
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-foreground">
                  {mat.nom}
                  <span className="block text-xs font-normal text-foreground-muted mt-1">
                    Valeur acq: {mat.valeur_acquisition ? formatMoney(mat.valeur_acquisition) : 'N/A'}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-right text-success">
                  {formatMoney(mat.recettes)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-right text-danger">
                  {formatMoney(mat.depenses)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-right font-medium text-foreground">
                  {formatMoney(mat.solde_net)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-right text-warning">
                  -{formatMoney(mat.amortissement_cumule)}
                </td>
                <td className={`whitespace-nowrap px-6 py-4 text-sm text-right font-bold ${mat.solde_apres_amortissement >= 0 ? 'text-primary' : 'text-danger'}`}>
                  {formatMoney(mat.solde_apres_amortissement)}
                </td>
              </tr>
            ))}
            {(!rentabilite || rentabilite.length === 0) && (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-foreground-muted italic">
                  Aucun équipement enregistré.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
