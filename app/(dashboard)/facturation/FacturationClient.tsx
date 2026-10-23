'use client'

import { useState, useMemo } from 'react'
import { Search, ReceiptText, Filter, RotateCcw, CheckCircle2, AlertCircle, Clock, Wallet } from 'lucide-react'
import DownloadPdfButton from './DownloadPdfButton'
import FactureWhatsAppModal from './FactureWhatsAppModal'

import GenererFacturesModal from './GenererFacturesModal'
import CalculInteretModal from './CalculInteretModal'
import { useUnite } from '@/components/DeviseProvider'

export default function FacturationClient({
  factures = [],
  campagnes = [],
  dict,
  locale,
  gieName,
}: {
  factures: any[]
  campagnes: { id: string; nom: string }[]
  dict: any
  locale: string
  gieName: string
}) {
  const unite = useUnite()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCampagneId, setSelectedCampagneId] = useState('')
  const [selectedStatut, setSelectedStatut] = useState<string>('all')

  const filteredFactures = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return factures.filter((f) => {
      // 1. Recherche texte (Nom, prénom, code membre, téléphone, ID, nom campagne)
      if (term) {
        const nom = (f.membre?.nom || '').toLowerCase()
        const prenom = (f.membre?.prenom || '').toLowerCase()
        const codeMembre = (f.membre?.code_membre || '').toLowerCase()
        const tel = (f.membre?.telephone || '').toLowerCase()
        const fid = (f.id || '').toLowerCase()
        const campNom = (f.campagne?.nom || '').toLowerCase()

        const match =
          nom.includes(term) ||
          prenom.includes(term) ||
          codeMembre.includes(term) ||
          tel.includes(term) ||
          fid.includes(term) ||
          campNom.includes(term) ||
          `${prenom} ${nom}`.includes(term)

        if (!match) return false
      }

      // 2. Filtre campagne
      if (selectedCampagneId && f.campagne_id !== selectedCampagneId && f.campagne?.id !== selectedCampagneId) {
        return false
      }

      // 3. Filtre statut
      if (selectedStatut !== 'all') {
        if (selectedStatut === 'impayee' && f.statut !== 'impayee') return false
        if (selectedStatut === 'payee' && f.statut !== 'payee') return false
        if (selectedStatut === 'partiellement_paye' && f.statut !== 'partiellement_paye') return false
      }

      return true
    })
  }, [factures, searchTerm, selectedCampagneId, selectedStatut])

  // KPIs
  const stats = useMemo(() => {
    let totalFacture = 0
    let totalPaye = 0
    let countImpayee = 0
    let countPartiel = 0
    let countPayee = 0

    filteredFactures.forEach((f) => {
      const montantInteret = Number(f.montant_interet || 0)
      const totalDu = Number(f.montant_total || 0) + montantInteret
      const paye = Number(f.montant_paye || 0)

      totalFacture += totalDu
      totalPaye += paye

      if (f.statut === 'payee') countPayee++
      else if (f.statut === 'partiellement_paye') countPartiel++
      else countImpayee++
    })

    const resteARecouvrer = Math.max(0, totalFacture - totalPaye)
    const tauxRecouvrement = totalFacture > 0 ? Math.round((totalPaye / totalFacture) * 100) : 0

    return {
      totalFacture,
      totalPaye,
      resteARecouvrer,
      tauxRecouvrement,
      countImpayee,
      countPartiel,
      countPayee,
      totalCount: filteredFactures.length,
    }
  }, [filteredFactures])

  const hasActiveFilters = Boolean(searchTerm || selectedCampagneId || selectedStatut !== 'all')

  const resetFilters = () => {
    setSearchTerm('')
    setSelectedCampagneId('')
    setSelectedStatut('all')
  }

  const formatAmount = (val: number) =>
    val.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div className="sm:flex-auto min-w-0">
          <h2 className="text-2xl font-bold font-heading text-foreground break-words">{dict.facturation.title}</h2>
          <p className="mt-2 text-sm text-foreground-muted break-words">
            {dict.facturation.desc}
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 sm:mt-0 sm:flex-none">
          <CalculInteretModal campagnes={campagnes} dict={dict} />
          <GenererFacturesModal dict={dict} campagnes={campagnes} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-surface-border bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Total Facturé</span>
            <span className="rounded-lg bg-primary/10 p-2 text-primary">
              <ReceiptText className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {formatAmount(stats.totalFacture)} {unite}
          </div>
          <p className="mt-1 text-xs text-foreground-muted">
            {stats.totalCount} facture(s) affichée(s)
          </p>
        </div>

        <div className="rounded-xl border border-surface-border bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Recouvré</span>
            <span className="rounded-lg bg-success/10 p-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-success">
            {formatAmount(stats.totalPaye)} {unite}
          </div>
          <p className="mt-1 text-xs text-foreground-muted">
            Taux de recouvrement : <span className="font-semibold text-foreground">{stats.tauxRecouvrement}%</span>
          </p>
        </div>

        <div className="rounded-xl border border-surface-border bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Reste à Recouvrer</span>
            <span className="rounded-lg bg-danger/10 p-2 text-danger">
              <Wallet className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-danger">
            {formatAmount(stats.resteARecouvrer)} {unite}
          </div>
          <p className="mt-1 text-xs text-foreground-muted">
            Créances membres en attente
          </p>
        </div>

        <div className="rounded-xl border border-surface-border bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground-muted uppercase tracking-wider">Répartition Statuts</span>
            <span className="rounded-lg bg-secondary/10 p-2 text-secondary">
              <Clock className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs font-medium">
            <span className="rounded bg-success/15 px-2 py-1 text-success">
              {stats.countPayee} payée(s)
            </span>
            <span className="rounded bg-secondary/15 px-2 py-1 text-secondary">
              {stats.countPartiel} partiel(s)
            </span>
            <span className="rounded bg-danger/15 px-2 py-1 text-danger">
              {stats.countImpayee} impayée(s)
            </span>
          </div>
          <p className="mt-2 text-xs text-foreground-muted">
            {filteredFactures.length} sur {factures.length} total
          </p>
        </div>
      </div>

      {/* Filtres & Recherche */}
      <div className="rounded-xl border border-surface-border bg-surface p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Filter className="h-4 w-4 text-primary" />
            <span>Filtres de recherche</span>
          </div>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Réinitialiser les filtres
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* Recherche texte */}
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-foreground-muted" aria-hidden="true" />
            </div>
            <input
              type="text"
              className="block w-full rounded-md border border-surface-border py-2 pl-9 pr-3 bg-background text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm shadow-sm"
              placeholder="Membre, code, tél, facture..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filtre campagne */}
          <div>
            <select
              value={selectedCampagneId}
              onChange={(e) => setSelectedCampagneId(e.target.value)}
              className="block w-full rounded-md border border-surface-border py-2 px-3 bg-background text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm shadow-sm"
            >
              <option value="">Toutes les campagnes</option>
              {campagnes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
          </div>

          {/* Filtre statut */}
          <div>
            <select
              value={selectedStatut}
              onChange={(e) => setSelectedStatut(e.target.value)}
              className="block w-full rounded-md border border-surface-border py-2 px-3 bg-background text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm shadow-sm"
            >
              <option value="all">Tous les statuts</option>
              <option value="impayee">Impayées</option>
              <option value="partiellement_paye">Partiellement payées</option>
              <option value="payee">Payées</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            {(() => {
              const hasAnyInteret = filteredFactures.some((f) => Number(f.montant_interet || 0) > 0)
              return (
                <div className="overflow-hidden overflow-x-auto shadow ring-1 ring-surface-border sm:rounded-lg bg-surface">
                  <table className="min-w-full divide-y divide-surface-border">
                    <thead className="bg-background/50">
                      <tr>
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-foreground sm:pl-6">{dict.facturation.table.member}</th>
                        <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-foreground">{dict.facturation.table.season}</th>
                        {hasAnyInteret && (
                          <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-foreground">{dict.facturation_extra.interest_col}</th>
                        )}
                        <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-foreground">{dict.facturation.table.total_due}</th>
                        <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-foreground">{dict.facturation.table.paid}</th>
                        <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-foreground">{dict.facturation.table.remaining}</th>
                        <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-foreground">{dict.facturation.table.status}</th>
                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                          <span className="sr-only">{dict.facturation.table.actions}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border bg-surface">
                      {filteredFactures.map((facture) => {
                        const montantInteret = Number(facture.montant_interet || 0)
                        const totalDu = Number(facture.montant_total || 0) + montantInteret
                        const resteAPayer = totalDu - (facture.montant_paye || 0)

                        return (
                          <tr key={facture.id} className="hover:bg-background/50 transition-colors">
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6">
                              <div className="flex items-center gap-3">
                                <div className="rounded-md bg-primary/10 p-2">
                                  <ReceiptText className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <div className="font-medium text-foreground">
                                    {facture.membre?.prenom} {facture.membre?.nom}
                                  </div>
                                  <div className="text-xs text-foreground-muted flex items-center gap-2">
                                    <span>N° {facture.id.substring(0, 8)}</span>
                                    {facture.membre?.code_membre && (
                                      <span className="rounded bg-background px-1.5 py-0.5 border border-surface-border font-mono text-[10px]">
                                        {facture.membre.code_membre}
                                      </span>
                                    )}
                                    {facture.membre?.telephone && (
                                      <span>· {facture.membre.telephone}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-right text-sm text-foreground-muted">
                              {facture.campagne?.nom}
                            </td>
                            {hasAnyInteret && (
                              <td className="whitespace-nowrap px-3 py-4 text-right text-sm text-foreground-muted">
                                {montantInteret > 0 ? formatAmount(montantInteret) + ' ' + unite : '-'}
                              </td>
                            )}
                            <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-bold text-foreground">
                              {formatAmount(totalDu)} {unite}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-right text-sm text-success">
                              {formatAmount(facture.montant_paye || 0)} {unite}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-bold text-danger">
                              {resteAPayer > 0 ? formatAmount(resteAPayer) + ' ' + unite : '-'}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-center text-sm">
                              <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                facture.statut === 'impayee' ? 'bg-danger/10 text-danger ring-danger/20' : 
                                facture.statut === 'payee' ? 'bg-success/10 text-success ring-success/20' :
                                'bg-secondary/10 text-secondary ring-secondary/20'
                              }`}>
                                {facture.statut === 'impayee' ? dict.facturation.table.status_unpaid : 
                                 facture.statut === 'payee' ? dict.facturation.table.status_paid : dict.facturation.table.status_partial}
                              </span>
                            </td>
                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                              <div className="flex justify-end items-center gap-1.5">
                                <FactureWhatsAppModal facture={facture} gieName={gieName} dict={dict} />
                                <DownloadPdfButton facture={facture} dict={dict} gieName={gieName} />
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                      
                      {filteredFactures.length === 0 && (
                        <tr>
                          <td colSpan={hasAnyInteret ? 8 : 7} className="px-6 py-8 text-center text-sm text-foreground-muted italic">
                            {hasActiveFilters ? (
                              <div className="flex flex-col items-center justify-center gap-2">
                                <span>Aucune facture ne correspond à vos critères de recherche.</span>
                                <button
                                  onClick={resetFilters}
                                  className="text-primary hover:underline font-medium inline-flex items-center gap-1 text-xs"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                  Réinitialiser les filtres
                                </button>
                              </div>
                            ) : (
                              dict.facturation.table.empty
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}
