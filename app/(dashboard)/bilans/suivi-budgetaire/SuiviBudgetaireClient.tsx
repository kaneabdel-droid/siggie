'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSuiviBudgetaire } from './actions'

type Ligne = {
  imputation_id: string
  libelle: string
  compte: string
  categorie: string
  nature: string
  prevu: number
  realise: number
  ecart: number
  taux: number | null
}

type Totals = { prevu: number; realise: number; ecart: number }
type Groupe = { lignes: Ligne[]; totals: Totals }

type CategorieData = { recettes: Groupe; depenses: Groupe; solde: Totals }

type SuiviData = {
  exploitation: CategorieData
  materiel: CategorieData
  consolide: CategorieData
}

const TABS = ['exploitation', 'materiel', 'consolide'] as const
type Tab = typeof TABS[number]

const formatFCFA = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })
const ecartColor = (ecart: number) => (ecart >= 0 ? 'text-success' : 'text-danger')

function tauxColor(taux: number | null, nature: 'recette' | 'depense') {
  if (taux === null) return 'text-foreground-muted'
  if (nature === 'recette') {
    // Recette : dépasser l'objectif est favorable.
    if (taux >= 100) return 'text-success'
    if (taux >= 80) return 'text-warning'
    return 'text-danger'
  }
  // Dépense : consommer moins que le budget est favorable.
  if (taux > 100) return 'text-danger'
  if (taux >= 80) return 'text-warning'
  return 'text-success'
}

function GroupeTable({ title, groupe, nature, t }: { title: string; groupe: Groupe; nature: 'recette' | 'depense'; t: any }) {
  if (groupe.lignes.length === 0) {
    return null
  }

  return (
    <div>
      <h4 className="text-sm font-semibold text-foreground mb-2">{title}</h4>
      <div className="overflow-x-auto rounded-lg border border-surface-border bg-surface shadow">
        <table className="min-w-full divide-y divide-surface-border">
          <thead className="bg-background">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers.rubrique}</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers.sous_rubrique}</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers.prevu}</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers.realise}</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers.ecart}</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers.taux}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border bg-surface">
            {groupe.lignes.map((l) => (
              <tr key={l.imputation_id} className="hover:bg-surface-hover transition-colors">
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-foreground">{l.libelle}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground-muted">{l.compte}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-right text-foreground">{formatFCFA(l.prevu)}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-right text-foreground">{formatFCFA(l.realise)}</td>
                <td className={`whitespace-nowrap px-6 py-4 text-sm text-right font-medium ${ecartColor(l.ecart)}`}>{formatFCFA(l.ecart)}</td>
                <td className={`whitespace-nowrap px-6 py-4 text-sm text-right font-medium ${tauxColor(l.taux, nature)}`}>
                  {l.taux === null ? '-' : `${Math.round(l.taux)}%`}
                </td>
              </tr>
            ))}
            <tr className="bg-background/80 font-bold">
              <td colSpan={2} className="px-6 py-4 text-sm text-foreground text-right italic">{t.total}</td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-right text-foreground">{formatFCFA(groupe.totals.prevu)}</td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-right text-foreground">{formatFCFA(groupe.totals.realise)}</td>
              <td className={`whitespace-nowrap px-6 py-4 text-sm text-right ${ecartColor(groupe.totals.ecart)}`}>{formatFCFA(groupe.totals.ecart)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function SuiviBudgetaireClient({
  campagnes,
  defaultCampagneId,
  dict,
}: {
  campagnes: { id: string; nom: string; statut: string }[]
  defaultCampagneId: string
  dict: any
}) {
  const [selectedCampagne, setSelectedCampagne] = useState(defaultCampagneId)
  const [activeTab, setActiveTab] = useState<Tab>('exploitation')
  const [data, setData] = useState<SuiviData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const t = dict.suivi_budgetaire

  const fetchData = useCallback(async () => {
    if (!selectedCampagne) return
    setLoading(true)
    const res = await getSuiviBudgetaire(selectedCampagne)
    setLoading(false)
    if (res?.error) {
      setError(res.error)
      setData(null)
    } else {
      setError('')
      setData(res as SuiviData)
    }
  }, [selectedCampagne])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const categorieData = data ? data[activeTab] : null
  const isEmpty = categorieData
    ? categorieData.recettes.lignes.length === 0 && categorieData.depenses.lignes.length === 0
    : false

  return (
    <div className="space-y-6">
      <div className="max-w-sm w-full">
        <label htmlFor="campagne" className="block text-sm font-medium text-foreground mb-1">{t.select_campaign}</label>
        <select
          id="campagne"
          value={selectedCampagne}
          onChange={(e) => setSelectedCampagne(e.target.value)}
          className="block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
        >
          {campagnes.map((c) => (
            <option key={c.id} value={c.id}>{c.nom}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-md px-3 py-2 text-sm font-medium border transition-colors ${
              activeTab === tab
                ? 'bg-primary text-white border-primary'
                : 'bg-surface text-foreground-muted hover:text-foreground border-surface-border'
            }`}
          >
            {t.tabs[tab]}
          </button>
        ))}
      </div>

      {loading && <div className="text-foreground-muted animate-pulse">{t.loading}</div>}
      {error && <div className="text-danger">{error}</div>}

      {!loading && !error && categorieData && (
        isEmpty ? (
          <div className="text-center py-12 text-foreground-muted bg-surface rounded-lg border border-surface-border">
            {t.empty}
          </div>
        ) : (
          <div className="space-y-6">
            <GroupeTable title={t.recettes_title} groupe={categorieData.recettes} nature="recette" t={t} />
            <GroupeTable title={t.depenses_title} groupe={categorieData.depenses} nature="depense" t={t} />

            <div className="rounded-lg border border-surface-border bg-primary/5 px-4 py-4 sm:px-6">
              <h4 className="text-sm font-semibold text-foreground mb-3">{t.solde_title}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-foreground-muted">{t.headers.prevu}</p>
                  <p className="text-lg font-semibold text-foreground">{formatFCFA(categorieData.solde.prevu)} FCFA</p>
                </div>
                <div>
                  <p className="text-xs text-foreground-muted">{t.headers.realise}</p>
                  <p className="text-lg font-semibold text-foreground">{formatFCFA(categorieData.solde.realise)} FCFA</p>
                </div>
                <div>
                  <p className="text-xs text-foreground-muted">{t.headers.ecart}</p>
                  <p className={`text-lg font-semibold ${ecartColor(categorieData.solde.ecart)}`}>{formatFCFA(categorieData.solde.ecart)} FCFA</p>
                </div>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  )
}
