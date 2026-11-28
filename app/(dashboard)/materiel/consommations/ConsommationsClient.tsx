'use client'

import { useMemo, useState } from 'react'
import { Filter, RotateCcw, Trash2 } from 'lucide-react'
import { deleteConsommation } from '../actions'
import EditConsommationModal from './EditConsommationModal'
import type { ContexteBudgetMateriel } from '../BudgetCampagneChamps'
import { useUnite } from '@/components/DeviseProvider'

export default function ConsommationsClient({ consommations, materiels, budget, dict, locale }: { consommations: any[], materiels: any[], budget: ContexteBudgetMateriel, dict: any, locale: string }) {
  const unite = useUnite()
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [selectedMaterielId, setSelectedMaterielId] = useState<string>('all')
  const [selectedCampagneId, setSelectedCampagneId] = useState<string>('all')
  const [dateDebut, setDateDebut] = useState<string>('')
  const [dateFin, setDateFin] = useState<string>('')
  const t = dict.materiel_pages.consommations

  async function handleDelete(id: string) {
    if (!confirm(t.delete_confirm)) return
    setUpdatingId(id)
    const res = await deleteConsommation(id)
    if (res?.error) {
      alert(res.error)
      setUpdatingId(null)
    }
  }

  const filteredConsommations = useMemo(() => {
    return consommations.filter((c) => {
      if (selectedMaterielId !== 'all' && c.materiel_id !== selectedMaterielId) return false
      if (selectedCampagneId === '__none__') {
        if (c.campagne_id) return false
      } else if (selectedCampagneId !== 'all' && c.campagne_id !== selectedCampagneId) {
        return false
      }
      const d = c.date_consommation ? String(c.date_consommation).slice(0, 10) : ''
      if (dateDebut && (!d || d < dateDebut)) return false
      if (dateFin && (!d || d > dateFin)) return false
      return true
    })
  }, [consommations, selectedMaterielId, selectedCampagneId, dateDebut, dateFin])

  const hasActiveFilters =
    selectedMaterielId !== 'all' ||
    selectedCampagneId !== 'all' ||
    Boolean(dateDebut) ||
    Boolean(dateFin)

  function resetFilters() {
    setSelectedMaterielId('all')
    setSelectedCampagneId('all')
    setDateDebut('')
    setDateFin('')
  }

  const total = filteredConsommations.reduce((sum, c) => sum + (c.montant_total || 0), 0)
  const dateLocale = locale === 'fr' ? 'fr-FR' : 'en-US'

  const inputClass =
    'block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'

  return (
    <div className="space-y-4">
      <div className="bg-surface border border-surface-border rounded-lg p-4 flex flex-wrap justify-between items-center gap-4 shadow-sm">
        <div>
          <h3 className="text-sm font-medium text-foreground-muted">{t.total}</h3>
          <p className="mt-1 text-2xl font-semibold text-danger">{total.toLocaleString(dateLocale, { maximumFractionDigits: 0 })}{unite}</p>
        </div>
        {hasActiveFilters && (
          <p className="text-xs text-foreground-muted">
            {filteredConsommations.length} sur {consommations.length} enregistrement(s)
          </p>
        )}
      </div>

      {/* Barre de filtres */}
      <div className="rounded-lg border border-surface-border bg-surface p-4 shadow-sm space-y-3 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
            <Filter className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Filtres</span>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Réinitialiser
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="filter-cons-materiel" className="block text-xs font-medium text-foreground-muted mb-1">
              {t.headers.equipment}
            </label>
            <select
              id="filter-cons-materiel"
              value={selectedMaterielId}
              onChange={(e) => setSelectedMaterielId(e.target.value)}
              className={inputClass}
            >
              <option value="all">Tous les matériels</option>
              {materiels.map((m) => (
                <option key={m.id} value={m.id}>{m.nom}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-cons-campagne" className="block text-xs font-medium text-foreground-muted mb-1">
              Campagne
            </label>
            <select
              id="filter-cons-campagne"
              value={selectedCampagneId}
              onChange={(e) => setSelectedCampagneId(e.target.value)}
              className={inputClass}
            >
              <option value="all">Toutes les campagnes</option>
              <option value="__none__">Sans campagne</option>
              {(budget.campagnes || []).map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-cons-debut" className="block text-xs font-medium text-foreground-muted mb-1">
              Période (Du)
            </label>
            <input
              id="filter-cons-debut"
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="filter-cons-fin" className="block text-xs font-medium text-foreground-muted mb-1">
              Période (Au)
            </label>
            <input
              id="filter-cons-fin"
              type="date"
              value={dateFin}
              min={dateDebut || undefined}
              onChange={(e) => setDateFin(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-surface-border bg-surface shadow">
        <table className="min-w-full divide-y divide-surface-border">
          <thead className="bg-background">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">{dict.common.date}</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers.equipment}</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers.type}</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers.quantity}</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers.amount}</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider print:hidden">{dict.common.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border bg-surface">
            {filteredConsommations.map((c) => (
              <tr key={c.id} className="hover:bg-surface-hover transition-colors">
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-foreground">
                  {new Date(c.date_consommation).toLocaleDateString(dateLocale)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">
                  {c.materiel?.nom || '-'}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground-muted">
                  <span className="font-medium text-foreground">{c.type_consommation}</span>
                  {c.campagne?.nom && <span className="ms-2 rounded bg-background px-1.5 py-0.5 text-xs">{c.campagne.nom}</span>}
                  {c.reference_piece && (
                    <span className="ms-2 rounded border border-surface-border bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                      Réf: {c.reference_piece}
                    </span>
                  )}
                  {c.fournisseur && <span className="block text-xs">{t.at_supplier} {c.fournisseur}</span>}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-right">
                  {c.quantite ? c.quantite : '-'}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-right font-medium text-danger">
                  -{c.montant_total.toLocaleString(dateLocale, { maximumFractionDigits: 0 })}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-right print:hidden">
                  <div className="flex items-center justify-end gap-2">
                    <EditConsommationModal consommation={c} materiels={materiels} budget={budget} dict={dict} />
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={updatingId === c.id}
                      title={t.delete_title}
                      className="text-danger hover:text-danger/80 p-1 rounded-md disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredConsommations.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-foreground-muted italic">
                  {hasActiveFilters ? 'Aucune consommation ne correspond aux filtres sélectionnés.' : t.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
