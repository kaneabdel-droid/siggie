'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Folder, CornerDownRight } from 'lucide-react'
import { getSuiviBudgetaire } from './actions'
import PrintSectionButton from '@/components/PrintSectionButton'
import { useUnite } from '@/components/DeviseProvider'

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

function GroupeTable({
  title,
  groupe,
  nature,
  t,
}: {
  title: string
  groupe: Groupe
  nature: 'recette' | 'depense'
  t: any
}) {
  // Regroupement par Rubrique (l.libelle) pour afficher les rubriques en titre de groupe avec leurs sous-totaux
  const rubriquesGroupes = useMemo(() => {
    const groups: {
      rubrique: string
      lignes: Ligne[]
      totals: { prevu: number; realise: number; ecart: number; taux: number | null }
    }[] = []
    const map = new Map<string, typeof groups[0]>()

    for (const l of groupe.lignes) {
      const rNom = (l.libelle || 'Autres').trim()
      if (!map.has(rNom)) {
        const g = {
          rubrique: rNom,
          lignes: [] as Ligne[],
          totals: { prevu: 0, realise: 0, ecart: 0, taux: null as number | null },
        }
        map.set(rNom, g)
        groups.push(g)
      }
      const g = map.get(rNom)!
      g.lignes.push(l)
      g.totals.prevu += l.prevu
      g.totals.realise += l.realise
      g.totals.ecart += l.ecart
    }

    for (const g of groups) {
      g.totals.taux = g.totals.prevu > 0 ? (g.totals.realise / g.totals.prevu) * 100 : null
    }

    return groups
  }, [groupe.lignes])

  if (groupe.lignes.length === 0) {
    return null
  }

  const grandTotalTaux =
    groupe.totals.prevu > 0 ? (groupe.totals.realise / groupe.totals.prevu) * 100 : null

  return (
    <div>
      <h4 className="text-sm font-semibold text-foreground mb-2">{title}</h4>
      <div className="overflow-x-auto rounded-lg border border-surface-border bg-surface shadow">
        <table className="min-w-full divide-y divide-surface-border">
          <thead className="bg-background">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">
                {t.headers?.sous_rubrique || 'Poste budgétaire'}
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">
                {t.headers?.prevu || 'Prévu'}
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">
                {t.headers?.realise || 'Réalisé'}
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">
                {t.headers?.ecart || 'Écart'}
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">
                {t.headers?.taux || 'Taux'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border bg-surface">
            {rubriquesGroupes.map((rg) => (
              <React.Fragment key={rg.rubrique}>
                {/* En-tête de la Rubrique (titre de groupe) avec sous-totaux */}
                <tr className="bg-background/80 font-semibold border-t border-b border-surface-border">
                  <td className="px-6 py-2.5 text-xs uppercase tracking-wider text-primary font-bold">
                    <div className="flex items-center gap-2">
                      <Folder className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{rg.rubrique}</span>
                      <span className="text-[10px] font-normal text-foreground-muted bg-surface px-1.5 py-0.5 rounded border border-surface-border">
                        {rg.lignes.length} {rg.lignes.length > 1 ? 'postes' : 'poste'}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-2.5 text-xs text-right font-bold text-foreground">
                    {formatFCFA(rg.totals.prevu)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-2.5 text-xs text-right font-bold text-foreground">
                    {formatFCFA(rg.totals.realise)}
                  </td>
                  <td className={`whitespace-nowrap px-6 py-2.5 text-xs text-right font-bold ${ecartColor(rg.totals.ecart)}`}>
                    {formatFCFA(rg.totals.ecart)}
                  </td>
                  <td className={`whitespace-nowrap px-6 py-2.5 text-xs text-right font-bold ${tauxColor(rg.totals.taux, nature)}`}>
                    {rg.totals.taux === null ? '-' : `${Math.round(rg.totals.taux)}%`}
                  </td>
                </tr>

                {/* Postes individuels sous la rubrique */}
                {rg.lignes.map((l) => (
                  <tr key={l.imputation_id} className="hover:bg-surface-hover transition-colors">
                    <td className="whitespace-nowrap px-6 py-3 text-sm text-foreground pl-10">
                      <div className="flex items-center gap-2">
                        <CornerDownRight className="w-3.5 h-3.5 text-foreground-muted/60 shrink-0" />
                        <span className="font-medium">{l.compte}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-sm text-right text-foreground">
                      {formatFCFA(l.prevu)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-sm text-right text-foreground">
                      {formatFCFA(l.realise)}
                    </td>
                    <td className={`whitespace-nowrap px-6 py-3 text-sm text-right font-medium ${ecartColor(l.ecart)}`}>
                      {formatFCFA(l.ecart)}
                    </td>
                    <td className={`whitespace-nowrap px-6 py-3 text-sm text-right font-medium ${tauxColor(l.taux, nature)}`}>
                      {l.taux === null ? '-' : `${Math.round(l.taux)}%`}
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}

            {/* Total général du groupe */}
            <tr className="bg-background/90 font-bold border-t-2 border-surface-border">
              <td className="px-6 py-4 text-sm text-foreground italic">{t.total}</td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-right text-foreground">{formatFCFA(groupe.totals.prevu)}</td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-right text-foreground">{formatFCFA(groupe.totals.realise)}</td>
              <td className={`whitespace-nowrap px-6 py-4 text-sm text-right ${ecartColor(groupe.totals.ecart)}`}>{formatFCFA(groupe.totals.ecart)}</td>
              <td className={`whitespace-nowrap px-6 py-4 text-sm text-right font-bold ${tauxColor(grandTotalTaux, nature)}`}>
                {grandTotalTaux === null ? '-' : `${Math.round(grandTotalTaux)}%`}
              </td>
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
  gieName,
}: {
  campagnes: { id: string; nom: string; statut: string }[]
  defaultCampagneId: string
  dict: any
  gieName: string
}) {
  const unite = useUnite()
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
  const selectedCampagneNom = campagnes.find((c) => c.id === selectedCampagne)?.nom || ''

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

      <div className="flex flex-wrap items-center justify-between gap-2">
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
        {categorieData && !isEmpty && (
          <PrintSectionButton sectionId="suivi-budgetaire-print" label={dict.common.print} />
        )}
      </div>

      {loading && <div className="text-foreground-muted animate-pulse">{t.loading}</div>}
      {error && <div className="text-danger">{error}</div>}

      {!loading && !error && categorieData && (
        isEmpty ? (
          <div className="text-center py-12 text-foreground-muted bg-surface rounded-lg border border-surface-border">
            {t.empty}
          </div>
        ) : (
          <div className="space-y-6" id="suivi-budgetaire-print">
            <div className="hidden print:block mb-4">
              <h2 className="text-xl font-bold text-foreground">{gieName}</h2>
              <p className="text-sm text-foreground-muted">{t.title} — {selectedCampagneNom} — {t.tabs[activeTab]}</p>
            </div>
            <GroupeTable title={t.recettes_title} groupe={categorieData.recettes} nature="recette" t={t} />
            <GroupeTable title={t.depenses_title} groupe={categorieData.depenses} nature="depense" t={t} />

            <div className="rounded-lg border border-surface-border bg-primary/5 px-4 py-4 sm:px-6">
              <h4 className="text-sm font-semibold text-foreground mb-3">{t.solde_title}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-foreground-muted">{t.headers.prevu}</p>
                  <p className="text-lg font-semibold text-foreground">{formatFCFA(categorieData.solde.prevu)}{unite}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground-muted">{t.headers.realise}</p>
                  <p className="text-lg font-semibold text-foreground">{formatFCFA(categorieData.solde.realise)}{unite}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground-muted">{t.headers.ecart}</p>
                  <p className={`text-lg font-semibold ${ecartColor(categorieData.solde.ecart)}`}>{formatFCFA(categorieData.solde.ecart)}{unite}</p>
                </div>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  )
}
