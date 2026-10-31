'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Search, X, RotateCcw } from 'lucide-react'
import { getReleveMembre } from './actions'
import PrintSectionButton from '@/components/PrintSectionButton'
import { useUnite } from '@/components/DeviseProvider'
import DownloadPdfButton from '@/app/(dashboard)/facturation/DownloadPdfButton'
import FactureWhatsAppModal from '@/app/(dashboard)/facturation/FactureWhatsAppModal'

export default function ReleveMembreClient({
  membres,
  dict,
  locale,
  gieName,
}: {
  membres: any[]
  dict: any
  locale: string
  gieName: string
}) {
  const unite = useUnite()
  const [selectedMembre, setSelectedMembre] = useState(membres[0]?.id || '')
  const [lignes, setLignes] = useState<any[]>([])
  const [soldeFinal, setSoldeFinal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const t = dict.bilans_pages.releve_membre
  const dateLocale = locale === 'fr' ? 'fr-FR' : 'en-US'

  const fetchReleve = useCallback(async () => {
    if (!selectedMembre) return
    setLoading(true)
    const res = await getReleveMembre(selectedMembre)
    setLoading(false)
    if (res?.error) {
      setError(res.error)
    } else {
      setError('')
      setLignes(res.lignes || [])
      setSoldeFinal(res.soldeFinal || 0)
    }
  }, [selectedMembre])

  useEffect(() => {
    fetchReleve()
  }, [fetchReleve])

  const filteredLignes = useMemo(() => {
    if (!searchTerm.trim()) return lignes
    const term = searchTerm.toLowerCase().trim()
    return lignes.filter((l) => {
      const desig = String(l.designation || '').toLowerCase()
      const type = String(l.type || '').toLowerCase()
      const mont = String(l.montant || '')
      const dateStr = String(l.date || '')
      const piece = String(l.reference_piece || '').toLowerCase()
      return (
        desig.includes(term) ||
        type.includes(term) ||
        mont.includes(term) ||
        dateStr.includes(term) ||
        piece.includes(term)
      )
    })
  }, [lignes, searchTerm])

  if (membres.length === 0) {
    return (
      <div className="text-center py-12 text-foreground-muted bg-surface rounded-lg border border-surface-border">
        {t.no_members}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h3 className="text-base font-semibold leading-6 text-foreground">{t.title}</h3>
        <p className="mt-2 text-sm text-foreground-muted">{t.desc}</p>
      </div>

      <div className="sm:flex sm:items-end sm:justify-between gap-4">
        <div className="max-w-sm w-full">
          <label htmlFor="membre" className="block text-sm font-medium text-foreground mb-1">{t.select_member}</label>
          <select
            id="membre"
            value={selectedMembre}
            onChange={(e) => setSelectedMembre(e.target.value)}
            className="block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
          >
            {membres.map((m) => (
              <option key={m.id} value={m.id}>{m.prenom} {m.nom} {m.code_membre ? `[${m.code_membre}]` : ''}</option>
            ))}
          </select>
        </div>
        {!loading && !error && (
          <div className="mt-4 sm:mt-0">
            <PrintSectionButton sectionId="releve-membre-print" label={dict.common.print} />
          </div>
        )}
      </div>

      {loading && <div className="text-foreground-muted animate-pulse">{t.loading}</div>}
      {error && <div className="text-danger p-4 bg-danger/10 rounded-md">{error}</div>}

      {!loading && !error && (
        <div id="releve-membre-print" className="space-y-4">
          <div className="hidden print:block mb-4">
            <h2 className="text-xl font-bold text-foreground">{gieName}</h2>
            <p className="text-sm text-foreground-muted">{t.title} — {membres.find((m) => m.id === selectedMembre)?.prenom || ''} {membres.find((m) => m.id === selectedMembre)?.nom || ''}</p>
          </div>
          <div className={`overflow-hidden rounded-lg px-4 py-5 shadow sm:p-6 max-w-xs ${soldeFinal > 0 ? 'bg-danger' : 'bg-success'} text-white`}>
            <dt className="text-sm font-medium text-white/90">
              {soldeFinal < 0 ? `${t.current_balance} (Surplus à ristourner)` : t.current_balance}
            </dt>
            <dd className="mt-1 text-2xl font-semibold tracking-tight">
              {soldeFinal.toLocaleString(dateLocale, { maximumFractionDigits: 0 })}{unite}
            </dd>
          </div>

          {/* Barre de Recherche du Relevé Membre */}
          <div className="flex items-center gap-3 bg-surface border border-surface-border p-3 rounded-lg shadow-2xs">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-foreground-muted" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher une opération du membre (campagne, prestation, référence, montant...)"
                className="w-full rounded-md border border-surface-border bg-background py-1.5 pl-9 pr-8 text-xs text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-foreground-muted hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="p-1.5 text-foreground-muted hover:text-foreground rounded-md border border-surface-border bg-background shadow-2xs"
                title="Effacer la recherche"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="overflow-x-auto rounded-lg border border-surface-border bg-surface shadow">
            <table className="min-w-full divide-y divide-surface-border">
              <thead className="bg-background">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers.season}</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers.date}</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers.billed}</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers.paid}</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers.balance}</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider print:hidden">Facture</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border bg-surface">
                {filteredLignes.map((l) => {
                  const isRistourne = l.type_ligne === 'ristourne_numeraire' || l.type_ligne === 'ristourne_nature'
                  const montantRistourne = Number(l.montant_ristourne || 0)
                  const factureDoc =
                    l.type_ligne === 'facture_campagne' && l.raw
                      ? { ...l.raw, type_document: 'campagne' as const }
                      : l.type_ligne === 'prestation_materiel' && l.raw
                      ? { ...l.raw, type_document: 'prestation' as const, tiers_type: 'membre' }
                      : l.type_ligne === 'vente_stock' && l.raw
                      ? { ...l.raw, type_document: 'vente_stock' as const, tiers_type: 'membre', montant_total: l.montant_facture }
                      : null

                  return (
                    <tr key={l.id} className="hover:bg-surface-hover transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-foreground">
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{l.campagne}</span>
                          {l.type_ligne === 'prestation_materiel' && (
                            <span className="inline-flex items-center rounded bg-secondary/15 px-1.5 py-0.5 text-[10px] font-medium text-secondary">
                              Prestation Matériel
                            </span>
                          )}
                          {l.type_ligne === 'vente_stock' && (
                            <span className="inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                              Vente Stock
                            </span>
                          )}
                          {isRistourne && (
                            <span className="inline-flex items-center rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                              {l.type_ligne === 'ristourne_nature' ? 'Ristourne Nature' : 'Ristourne Espèces'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground-muted">
                        {l.date ? new Date(l.date).toLocaleDateString(dateLocale) : '-'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-right text-foreground">
                        {isRistourne ? (
                          <span className="text-foreground-muted">-</span>
                        ) : (
                          `${l.montant_facture.toLocaleString(dateLocale, { maximumFractionDigits: 0 })}${unite}`
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-right">
                        {isRistourne ? (
                          <span className="font-medium text-warning" title="Ristourne versée au membre (réduit le surplus)">
                            -{montantRistourne.toLocaleString(dateLocale, { maximumFractionDigits: 0 })}{unite} (Ristourné)
                          </span>
                        ) : (
                          <span className="text-success">
                            {l.montant_paye.toLocaleString(dateLocale, { maximumFractionDigits: 0 })}{unite}
                          </span>
                        )}
                      </td>
                      <td className={`whitespace-nowrap px-6 py-4 text-sm text-right font-semibold ${l.solde_progressif > 0 ? 'text-danger' : 'text-success'}`}>
                        {l.solde_progressif.toLocaleString(dateLocale, { maximumFractionDigits: 0 })}{unite}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-right print:hidden">
                        {factureDoc ? (
                          <div className="flex items-center justify-end gap-1">
                            <FactureWhatsAppModal facture={factureDoc} gieName={gieName} dict={dict} />
                            <DownloadPdfButton facture={factureDoc} dict={dict} gieName={gieName} />
                          </div>
                        ) : (
                          <span className="text-foreground-muted">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {filteredLignes.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-foreground-muted italic">
                      {t.empty}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

