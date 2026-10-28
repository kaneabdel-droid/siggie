'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { getJournal } from '../actions'
import AddTransactionModal from './AddTransactionModal'
import TransactionRowActions from './TransactionRowActions'
import PrintSectionButton from '@/components/PrintSectionButton'
import { Truck, ArrowLeftRight, User, Filter, RotateCcw } from 'lucide-react'
import { useUnite } from '@/components/DeviseProvider'

type Campagne = { id: string; nom: string; statut: string }

export default function JournalClient({
  comptes,
  imputations,
  campagnes,
  clients = [],
  membres = [],
  materiels = [],
  dict,
  locale,
  gieName,
}: {
  comptes: any[]
  imputations: any[]
  campagnes: Campagne[]
  clients?: any[]
  membres?: any[]
  materiels?: any[]
  dict: any
  locale: string
  gieName: string
}) {
  const unite = useUnite()
  const [selectedCompte, setSelectedCompte] = useState(comptes[0]?.id || '')
  const [journal, setJournal] = useState<any[]>([])
  const [soldeInitial, setSoldeInitial] = useState(0)
  const [repartitionMateriel, setRepartitionMateriel] = useState<any[]>([])
  const [selectedMaterielFilter, setSelectedMaterielFilter] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const t = dict?.tresorerie_pages?.journaux || {}
  const dateLocale = locale === 'fr' ? 'fr-FR' : 'en-US'

  const fetchJournal = useCallback(async () => {
    if (!selectedCompte) return
    setLoading(true)
    const res = await getJournal(selectedCompte)
    setLoading(false)
    if (res?.error) {
      setError(res.error)
    } else {
      setError('')
      setJournal(res.journal || [])
      setSoldeInitial(res.soldeInitial || 0)
      setRepartitionMateriel(res.repartitionMateriel || [])
    }
  }, [selectedCompte])

  useEffect(() => {
    fetchJournal()
  }, [fetchJournal])

  const currentCompte = comptes.find((c) => c.id === selectedCompte)
  const isCaisseMateriel = (currentCompte?.nom || '').toLowerCase().includes('matériel') ||
    (currentCompte?.nom || '').toLowerCase().includes('materiel') ||
    repartitionMateriel.length > 0

  const filteredJournal = useMemo(() => {
    if (selectedMaterielFilter === 'all') return journal
    return journal.filter((ligne) => ligne.materiel_nom === selectedMaterielFilter)
  }, [journal, selectedMaterielFilter])

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-end sm:justify-between sm:gap-4">
        <div className="max-w-sm w-full">
          <label htmlFor="compte" className="block text-sm font-medium text-foreground mb-1">{t.select_account || "Sélectionner un compte"}</label>
          <select
            id="compte"
            value={selectedCompte}
            onChange={(e) => {
              setSelectedCompte(e.target.value)
              setSelectedMaterielFilter('all')
            }}
            className="block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm font-semibold"
          >
            {comptes.map(c => (
              <option key={c.id} value={c.id}>{c.nom} ({c.type_compte})</option>
            ))}
          </select>
        </div>
        <div className="mt-4 sm:mt-0 sm:flex-none flex items-center gap-2">
          <PrintSectionButton sectionId="journal-print" label={dict?.common?.print || "Imprimer"} />
          <AddTransactionModal
            compteId={selectedCompte}
            comptes={comptes}
            imputations={imputations}
            campagnes={campagnes}
            clients={clients}
            membres={membres}
            materiels={materiels}
            onSuccess={fetchJournal}
            dict={dict}
          />
        </div>
      </div>

      {/* Répartition par matériel pour Caisse Matériel ou transactions matérielles */}
      {isCaisseMateriel && repartitionMateriel.length > 0 && (
        <div className="rounded-xl border border-surface-border bg-surface p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-secondary" />
              <h4 className="text-sm font-bold text-foreground font-heading">
                Répartition des flux par Matériel
              </h4>
            </div>
            {selectedMaterielFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedMaterielFilter('all')}
                className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Afficher tout le journal</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {repartitionMateriel.map((m) => {
              const isFiltered = selectedMaterielFilter === m.nom
              return (
                <button
                  type="button"
                  key={m.nom}
                  onClick={() => setSelectedMaterielFilter(isFiltered ? 'all' : m.nom)}
                  className={`text-left p-3 rounded-lg border transition-all ${
                    isFiltered
                      ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary'
                      : 'border-surface-border bg-background/50 hover:bg-background'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-foreground">
                    <span className="truncate">{m.nom}</span>
                    <span className={`font-mono ${m.net >= 0 ? 'text-success' : 'text-danger'}`}>
                      {m.net >= 0 ? '+' : ''}{m.net.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} {unite}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-foreground-muted">
                    <span className="text-success font-medium">+{m.entrees.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} {unite}</span>
                    <span className="text-danger font-medium">-{m.sorties.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} {unite}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {loading && <div className="text-foreground-muted animate-pulse">{t.loading || "Chargement..."}</div>}
      {error && <div className="text-danger p-4 bg-danger/10 rounded-md">{error}</div>}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-lg border border-surface-border bg-surface shadow" id="journal-print">
          <div className="hidden print:block px-6 pt-4">
            <h2 className="text-xl font-bold text-foreground">{gieName}</h2>
            <p className="text-sm text-foreground-muted">{t.title || "Journal de trésorerie"} — {currentCompte?.nom || ''}</p>
          </div>
          <table className="min-w-full divide-y divide-surface-border">
            <thead className="bg-background">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">Motif / Opération</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">Tiers / Contrepartie</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers?.in || "Entrée"}</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers?.out || "Sortie"}</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers?.balance || "Solde"}</th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border bg-surface">
              {filteredJournal.map((ligne, idx) => {
                const isVirement = ligne.type_piece === 'virement_interne'
                return (
                  <tr key={ligne.id || idx} className="hover:bg-surface-hover transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground font-mono">
                      {new Date(ligne.date_effective || ligne.created_at).toLocaleDateString(dateLocale)}
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      <div className="font-medium">{ligne.motif_affiche || ligne.motif}</div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {ligne.type_piece && (
                          <span className={`inline-flex items-center rounded px-1.5 py-0.2 text-[10px] font-medium ${
                            isVirement ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-surface text-foreground-muted border border-surface-border'
                          }`}>
                            {isVirement ? 'Virement équilibré' : ligne.type_piece}
                          </span>
                        )}
                        {ligne.materiel_nom && (
                          <span className="inline-flex items-center gap-1 rounded bg-secondary/15 px-1.5 py-0.2 text-[10px] font-medium text-secondary border border-secondary/20">
                            <Truck className="w-2.5 h-2.5" />
                            <span>{ligne.materiel_nom}</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-background text-foreground border border-surface-border">
                        <User className="w-3 h-3 text-primary" />
                        <span>{ligne.tiers_affiche || '-'}</span>
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-right text-success font-medium font-mono">
                      {ligne.entree ? `+${ligne.entree.toLocaleString(dateLocale, { maximumFractionDigits: 0 })}` : ''}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-right text-danger font-medium font-mono">
                      {ligne.sortie ? `-${ligne.sortie.toLocaleString(dateLocale, { maximumFractionDigits: 0 })}` : ''}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-right text-foreground font-semibold bg-background/50 font-mono">
                      {ligne.solde.toLocaleString(dateLocale, { maximumFractionDigits: 0 })} {unite}
                    </td>
                    <td className="relative whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <TransactionRowActions transaction={ligne} imputations={imputations} campagnes={campagnes} onSuccess={fetchJournal} dict={dict} />
                    </td>
                  </tr>
                )
              })}
              {/* Ligne du solde initial */}
              <tr className="bg-background/80">
                <td colSpan={5} className="px-6 py-4 text-sm font-medium text-foreground text-right italic">
                  {t.initial_balance || "Solde initial"}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-right text-foreground font-semibold font-mono">
                  {Number(soldeInitial).toLocaleString(dateLocale, { maximumFractionDigits: 0 })} {unite}
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
