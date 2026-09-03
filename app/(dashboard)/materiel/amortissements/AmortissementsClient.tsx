'use client'

import { useState } from 'react'

export default function AmortissementsClient({ materiels }: { materiels: any[] }) {
  const [selectedMatId, setSelectedMatId] = useState<string | null>(materiels.length > 0 ? materiels[0].id : null)

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount)
  }

  // Générer le tableau d'amortissement pour le matériel sélectionné
  const getTableauAmortissement = (mat: any) => {
    if (!mat.valeur_acquisition || !mat.duree_vie_economique || !mat.date_acquisition) {
      return null
    }

    const tableau = []
    const taux = 1 / mat.duree_vie_economique
    const dateAcq = new Date(mat.date_acquisition)
    const anneeAcq = dateAcq.getFullYear()
    
    // Prorata temporis de la première année (base 360 jours)
    const joursEcoulesPremiereAnnee = Math.max(0, 360 - ((dateAcq.getMonth() * 30) + dateAcq.getDate()))
    const prorata = joursEcoulesPremiereAnnee / 360
    
    let base = mat.valeur_acquisition
    let amortissementCumule = 0

    // Première année (prorata temporis)
    let annuite1 = (base * taux) * prorata
    amortissementCumule += annuite1
    let vnc = base - amortissementCumule

    tableau.push({
      annee: anneeAcq,
      base: base,
      annuite: annuite1,
      cumul: amortissementCumule,
      vnc: vnc
    })

    // Années suivantes
    let anneeCourante = anneeAcq + 1
    const annuitePleine = base * taux

    for (let i = 1; i < mat.duree_vie_economique; i++) {
      amortissementCumule += annuitePleine
      vnc = base - amortissementCumule
      tableau.push({
        annee: anneeCourante,
        base: base,
        annuite: annuitePleine,
        cumul: amortissementCumule,
        vnc: vnc
      })
      anneeCourante++
    }

    // Dernière année (le reliquat si prorata)
    if (prorata < 1 && Math.round(vnc) > 0) {
      const annuiteFinale = vnc // Le reste
      amortissementCumule += annuiteFinale
      vnc = 0
      tableau.push({
        annee: anneeCourante,
        base: base,
        annuite: annuiteFinale,
        cumul: amortissementCumule,
        vnc: vnc
      })
    }

    return tableau
  }

  const selectedMat = materiels.find(m => m.id === selectedMatId)
  const tableau = selectedMat ? getTableauAmortissement(selectedMat) : null

  return (
    <div className="space-y-6">
      <div className="bg-surface p-4 rounded-lg border border-surface-border shadow-sm">
        <label htmlFor="materiel-select" className="block text-sm font-medium text-foreground mb-2">
          Sélectionner un équipement pour voir son tableau d'amortissement :
        </label>
        <select
          id="materiel-select"
          value={selectedMatId || ''}
          onChange={(e) => setSelectedMatId(e.target.value)}
          className="block w-full max-w-md rounded-md border-surface-border bg-background py-2 pl-3 pr-10 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
        >
          {materiels.map(mat => (
            <option key={mat.id} value={mat.id}>
              {mat.nom} ({mat.valeur_acquisition ? formatMoney(mat.valeur_acquisition) : 'Non valorisé'})
            </option>
          ))}
        </select>
      </div>

      {selectedMat && tableau ? (
        <div className="overflow-x-auto rounded-lg border border-surface-border bg-surface shadow">
          <div className="px-6 py-4 border-b border-surface-border bg-background">
            <h4 className="text-lg font-medium text-foreground">Tableau d'amortissement (Linéaire) - {selectedMat.nom}</h4>
            <p className="text-sm text-foreground-muted mt-1">
              Date d'acquisition : {new Date(selectedMat.date_acquisition).toLocaleDateString('fr-FR')} | 
              Durée : {selectedMat.duree_vie_economique} ans | 
              Taux : {Math.round((1 / selectedMat.duree_vie_economique) * 100)}%
            </p>
          </div>
          <table className="min-w-full divide-y divide-surface-border">
            <thead className="bg-surface">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">Année</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">Base à amortir</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">Annuité</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">Amort. Cumulé</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-foreground uppercase tracking-wider">VNC (Valeur Nette)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border bg-surface">
              {tableau.map((ligne, index) => (
                <tr key={ligne.annee} className="hover:bg-surface-hover transition-colors">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-foreground">
                    {ligne.annee}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-right text-foreground-muted">
                    {formatMoney(ligne.base)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-right text-warning">
                    {formatMoney(ligne.annuite)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-right text-warning font-medium">
                    {formatMoney(ligne.cumul)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-right font-bold text-foreground">
                    {formatMoney(Math.max(0, ligne.vnc))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : selectedMat ? (
        <div className="p-4 bg-warning/10 text-warning rounded-md">
          Impossible de calculer l'amortissement pour cet équipement. Vérifiez que la valeur d'acquisition, la date et la durée de vie sont bien renseignées.
        </div>
      ) : null}
    </div>
  )
}
