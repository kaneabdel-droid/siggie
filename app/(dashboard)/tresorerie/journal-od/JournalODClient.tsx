'use client'

import { useState, useMemo } from 'react'
import {
  FileText,
  Search,
  ArrowDownCircle,
  ArrowUpCircle,
  Scale,
  Trash2,
  Calendar,
  Building2,
  Tag,
  Receipt,
  Filter
} from 'lucide-react'
import AddOperationODModal from './AddOperationODModal'
import PrintSectionButton from '@/components/PrintSectionButton'
import { useUnite } from '@/components/DeviseProvider'
import { deleteOperationOD, OperationOD } from './actions'

export default function JournalODClient({
  initialOperations,
  imputations,
  comptes,
  dict,
  locale,
  gieName,
}: {
  initialOperations: OperationOD[]
  imputations: { id: string; libelle: string; compte: string; categorie?: string; nature?: string }[]
  comptes: { id: string; nom: string; type_compte: string }[]
  dict: any
  locale: string
  gieName: string
}) {
  const unite = useUnite()
  const [operations, setOperations] = useState<OperationOD[]>(initialOperations)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'charge' | 'produit'>('all')
  const [imputationFilter, setImputationFilter] = useState('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const dateLocale = locale === 'fr' ? 'fr-FR' : 'en-US'

  // Liste unique des imputations trouvées dans les opérations
  const availableImputations = useMemo(() => {
    const set = new Set<string>()
    operations.forEach((op) => {
      if (op.imputation_libelle) set.add(op.imputation_libelle)
    })
    return Array.from(set).sort()
  }, [operations])

  // Filtrage des opérations
  const filteredOperations = useMemo(() => {
    return operations.filter((op) => {
      if (typeFilter !== 'all' && op.type_operation !== typeFilter) return false
      if (imputationFilter !== 'all' && op.imputation_libelle !== imputationFilter) return false

      if (!searchTerm.trim()) return true
      const term = searchTerm.toLowerCase()
      return (
        op.libelle.toLowerCase().includes(term) ||
        (op.tiers && op.tiers.toLowerCase().includes(term)) ||
        (op.reference_piece && op.reference_piece.toLowerCase().includes(term)) ||
        (op.imputation_libelle && op.imputation_libelle.toLowerCase().includes(term)) ||
        (op.compte_nom && op.compte_nom.toLowerCase().includes(term))
      )
    })
  }, [operations, typeFilter, imputationFilter, searchTerm])

  // KPIs
  const stats = useMemo(() => {
    let totalCharges = 0
    let totalProduits = 0

    filteredOperations.forEach((op) => {
      if (op.type_operation === 'produit') {
        totalProduits += op.montant
      } else {
        totalCharges += op.montant
      }
    })

    const soldeNet = totalProduits - totalCharges

    return {
      totalCharges,
      totalProduits,
      soldeNet,
      count: filteredOperations.length,
    }
  }, [filteredOperations])

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous supprimer cette écriture du journal OD ?")) return
    setDeletingId(id)
    const res = await deleteOperationOD(id)
    setDeletingId(null)
    if (res?.success) {
      setOperations((prev) => prev.filter((o) => o.id !== id))
    }
  }

  const formatAmount = (val: number) =>
    val.toLocaleString(dateLocale, { maximumFractionDigits: 0 })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div>
          <h3 className="text-xl font-bold font-heading text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Journal OD (Opérations Diverses)
          </h3>
          <p className="mt-1 text-sm text-foreground-muted">
            Suivi des frais généraux (électricité, loyers, eau, fournitures, réunions...) et autres produits d&apos;exploitation.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex flex-wrap gap-2.5">
          <AddOperationODModal
            imputations={imputations}
            comptes={comptes}
            onCreated={() => {
              window.location.reload()
            }}
          />
          {filteredOperations.length > 0 && (
            <PrintSectionButton sectionId="journal-od-print" label="Imprimer le Journal OD" />
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-surface-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
              Total Frais Généraux (Charges)
            </span>
            <span className="rounded-lg bg-amber-500/10 p-2 text-amber-600">
              <ArrowDownCircle className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600">
            {formatAmount(stats.totalCharges)} {unite}
          </div>
          <p className="mt-1 text-xs text-foreground-muted">
            Électricité, loyers, fournitures, divers...
          </p>
        </div>

        <div className="rounded-xl border border-surface-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
              Total Autres Produits (Recettes)
            </span>
            <span className="rounded-lg bg-success/10 p-2 text-success">
              <ArrowUpCircle className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-success">
            {formatAmount(stats.totalProduits)} {unite}
          </div>
          <p className="mt-1 text-xs text-foreground-muted">
            Subventions, produits financiers, dons...
          </p>
        </div>

        <div className="rounded-xl border border-surface-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
              Solde Net des OD
            </span>
            <span className={`rounded-lg p-2 ${stats.soldeNet >= 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
              <Scale className="h-5 w-5" />
            </span>
          </div>
          <div className={`mt-2 text-2xl font-bold ${stats.soldeNet >= 0 ? 'text-success' : 'text-danger'}`}>
            {stats.soldeNet >= 0 ? '+' : ''}{formatAmount(stats.soldeNet)} {unite}
          </div>
          <p className="mt-1 text-xs text-foreground-muted">
            {stats.count} écriture(s) affichée(s)
          </p>
        </div>
      </div>

      {/* Barre de Recherche et Filtres */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface border border-surface-border p-3.5 rounded-xl shadow-xs">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-foreground-muted" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par tiers (Senelec...), libellé, référence, imputation..."
            className="w-full rounded-lg border border-surface-border bg-background py-1.5 pl-9 pr-3 text-xs text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtre Type */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="rounded-lg border border-surface-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
          >
            <option value="all">Tous types</option>
            <option value="charge">Charges / Frais généraux</option>
            <option value="produit">Autres produits</option>
          </select>

          {/* Filtre Imputation */}
          <select
            value={imputationFilter}
            onChange={(e) => setImputationFilter(e.target.value)}
            className="rounded-lg border border-surface-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
          >
            <option value="all">Toutes les imputations</option>
            {availableImputations.map((imp) => (
              <option key={imp} value={imp}>
                {imp}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tableau du Journal OD */}
      <div id="journal-od-print" className="space-y-4">
        <div className="hidden print:block mb-4 p-4 border-b border-surface-border">
          <h2 className="text-xl font-bold text-foreground">{gieName}</h2>
          <p className="text-sm text-foreground-muted">Journal des Opérations Diverses (Frais généraux & Autres produits)</p>
          <div className="mt-2 text-xs flex gap-6 text-foreground-muted">
            <span>Date d&apos;impression : {new Date().toLocaleDateString(dateLocale)}</span>
            <span>Total Charges : {formatAmount(stats.totalCharges)} {unite}</span>
            <span>Total Produits : {formatAmount(stats.totalProduits)} {unite}</span>
            <span><strong>Solde Net : {formatAmount(stats.soldeNet)} {unite}</strong></span>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-surface-border bg-surface shadow-xs">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-surface-border text-sm">
              <thead className="bg-background/70">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                    Tiers
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                    Référence
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                    Libellé de l&apos;opération
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                    Imputation Budgétaire
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                    Montant
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-foreground-muted uppercase tracking-wider print:hidden">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border bg-surface">
                {filteredOperations.map((op) => {
                  const isCharge = op.type_operation === 'charge'
                  return (
                    <tr key={op.id} className="hover:bg-surface-hover transition-colors">
                      <td className="whitespace-nowrap px-4 py-3 text-xs font-medium text-foreground">
                        {new Date(op.date_operation).toLocaleDateString(dateLocale)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          isCharge
                            ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                            : 'bg-success/10 text-success border border-success/20'
                        }`}>
                          {isCharge ? 'Charge / Frais' : 'Autre Produit'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-foreground">
                        {op.tiers || '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs font-mono text-foreground-muted">
                        {op.reference_piece || '-'}
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground">
                        <div className="font-medium text-foreground">{op.libelle}</div>
                        {op.compte_nom && (
                          <div className="text-[11px] text-foreground-muted">
                            Règlement : {op.compte_nom}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className="inline-flex items-center gap-1 rounded bg-background px-2 py-0.5 text-[11px] font-medium text-foreground border border-surface-border">
                          <Tag className="h-3 w-3 text-primary" />
                          {op.imputation_libelle || 'Frais généraux'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-xs">
                        <span className={isCharge ? 'text-amber-600' : 'text-success'}>
                          {isCharge ? '-' : '+'}{formatAmount(op.montant)} {unite}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-xs print:hidden">
                        <button
                          type="button"
                          onClick={() => handleDelete(op.id)}
                          disabled={deletingId === op.id}
                          className="p-1 text-foreground-muted hover:text-danger rounded hover:bg-danger/10 transition-colors"
                          title="Supprimer cette écriture"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}

                {filteredOperations.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-foreground-muted italic">
                      Aucune écriture trouvée dans le Journal OD.
                    </td>
                  </tr>
                )}
              </tbody>

              {filteredOperations.length > 0 && (
                <tfoot className="bg-background font-semibold border-t-2 border-surface-border">
                  <tr>
                    <td colSpan={6} className="px-4 py-3 text-right text-xs uppercase tracking-wider text-foreground">
                      Solde Net des opérations filtrées :
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-bold">
                      <span className={stats.soldeNet >= 0 ? 'text-success' : 'text-danger'}>
                        {stats.soldeNet >= 0 ? '+' : ''}{formatAmount(stats.soldeNet)} {unite}
                      </span>
                    </td>
                    <td className="print:hidden"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
