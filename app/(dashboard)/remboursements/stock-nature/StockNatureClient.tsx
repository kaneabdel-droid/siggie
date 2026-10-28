'use client'

import { useState, useEffect, useCallback } from 'react'
import { getStockNature } from './actions'
import AddSortieModal from './AddSortieModal'
import { useUnite } from '@/components/DeviseProvider'
import DownloadPdfButton from '@/app/(dashboard)/facturation/DownloadPdfButton'
import FactureWhatsAppModal from '@/app/(dashboard)/facturation/FactureWhatsAppModal'

export default function StockNatureClient({
  campagnes,
  membres,
  initialClients,
  dict,
  locale,
  gieName = 'Mon GIE',
}: {
  campagnes: any[]
  membres: any[]
  initialClients: { id: string; nom: string }[]
  dict: any
  locale: string
  gieName?: string
}) {
  const unite = useUnite()
  const [selectedCampagne, setSelectedCampagne] = useState(campagnes[0]?.id || '')
  const [clients, setClients] = useState(initialClients)
  const [journal, setJournal] = useState<any[]>([])
  const [soldeActuel, setSoldeActuel] = useState(0)
  const [campagneInfo, setCampagneInfo] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const t = dict.remboursements_pages.stock_nature
  const dateLocale = locale === 'fr' ? 'fr-FR' : 'en-US'

  const fetchStock = useCallback(async () => {
    if (!selectedCampagne) return
    setLoading(true)
    const res = await getStockNature(selectedCampagne)
    setLoading(false)
    if (res?.error) {
      setError(res.error)
    } else {
      setError('')
      setJournal(res.journal || [])
      setSoldeActuel(res.soldeActuel || 0)
      setCampagneInfo(res.campagne || null)
    }
  }, [selectedCampagne])

  useEffect(() => {
    fetchStock()
  }, [fetchStock])

  const typeLabel = (type: string) => {
    if (type === 'entree') return t.type_entree
    if (type === 'vente') return t.type_vente
    return t.type_ristourne
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-end sm:justify-between sm:gap-4">
        <div className="max-w-sm w-full">
          <label htmlFor="campagne" className="block text-sm font-medium text-foreground mb-1">{t.select_campaign}</label>
          <select
            id="campagne"
            value={selectedCampagne}
            onChange={(e) => setSelectedCampagne(e.target.value)}
            className="block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
          >
            {campagnes.map((c) => (
              <option key={c.id} value={c.id}>{c.nom} ({c.statut})</option>
            ))}
          </select>
        </div>
        <div className="mt-4 sm:mt-0 sm:flex-none">
          <AddSortieModal
            campagneId={selectedCampagne}
            membres={membres}
            clients={clients}
            onClientCreated={(c) => setClients((prev) => [...prev, c].sort((a, b) => a.nom.localeCompare(b.nom)))}
            onSuccess={fetchStock}
            dict={dict}
          />
        </div>
      </div>

      {!loading && !error && (
        <div className="overflow-hidden rounded-lg bg-primary px-4 py-5 shadow sm:p-6 text-white max-w-xs">
          <dt className="text-sm font-medium text-white/80">{t.current_stock}{campagneInfo?.produit_collecte ? ` (${campagneInfo.produit_collecte})` : ''}</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight">{Number(soldeActuel).toLocaleString(dateLocale, { maximumFractionDigits: 2 })} kg</dd>
        </div>
      )}

      {loading && <div className="text-foreground-muted animate-pulse">{t.loading}</div>}
      {error && <div className="text-danger">{error}</div>}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-lg border border-surface-border bg-surface shadow">
          <table className="min-w-full divide-y divide-surface-border">
            <thead className="bg-background">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers.date}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers.type}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers.tiers}</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers.unit_price}</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers.quantity}</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers.balance}</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider print:hidden">Facture</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border bg-surface">
              {journal.map((m, idx) => {
                const isVente = m.type === 'vente'
                const isMembre = m.tiers_type === 'membre'
                const factureVente = isVente
                  ? {
                      id: m.id,
                      type_document: 'vente_stock' as const,
                      tiers_type: m.tiers_type || 'client',
                      tiers_nom: m.tiers,
                      membre: m.membre || null,
                      client: m.client || null,
                      campagne: campagneInfo,
                      date_sortie: m.date,
                      quantite: m.quantite,
                      prix_unitaire: m.prix_unitaire,
                      montant_total: Number(m.quantite || 0) * Number(m.prix_unitaire || 0),
                      motif: m.motif,
                    }
                  : null

                return (
                  <tr key={m.id || idx} className="hover:bg-surface-hover transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">
                      {new Date(m.date).toLocaleDateString(dateLocale)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                        m.type === 'entree' ? 'bg-success/10 text-success ring-success/20' :
                        m.type === 'vente' ? 'bg-primary/10 text-primary ring-primary/20' :
                        'bg-warning/10 text-warning ring-warning/20'
                      }`}>
                        {typeLabel(m.type)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{m.tiers}</span>
                          {isVente && (
                            <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                              isMembre ? 'bg-primary/10 text-primary' : 'bg-secondary/15 text-secondary'
                            }`}>
                              {isMembre ? 'Relevé Membre' : 'Relevé Client'}
                            </span>
                          )}
                        </div>
                        {m.type === 'entree' && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                              m.origine_stock === 'materiel'
                                ? 'bg-secondary/15 text-secondary border border-secondary/20'
                                : m.origine_stock === 'achat'
                                ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                                : 'bg-primary/10 text-primary border border-primary/20'
                            }`}>
                              {m.origine_stock === 'materiel'
                                ? 'Origine : Matériel (Prestation)'
                                : m.origine_stock === 'achat'
                                ? 'Origine : Achat (Revente)'
                                : 'Origine : Exploitation (Membre)'}
                            </span>
                            {m.variete && (
                              <span className="inline-flex items-center rounded bg-background px-1.5 py-0.5 text-[10px] font-mono text-foreground-muted border border-surface-border">
                                Var. {m.variete}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-right text-foreground-muted">
                      {Number(m.prix_unitaire).toLocaleString(dateLocale, { maximumFractionDigits: 0 })}{unite}
                    </td>
                    <td className={`whitespace-nowrap px-6 py-4 text-sm text-right font-medium ${m.type === 'entree' ? 'text-success' : 'text-danger'}`}>
                      {m.type === 'entree' ? '+' : '-'}{Number(m.quantite).toLocaleString(dateLocale, { maximumFractionDigits: 2 })}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-right text-foreground font-semibold bg-background/50">
                      {Number(m.solde).toLocaleString(dateLocale, { maximumFractionDigits: 2 })}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-right print:hidden">
                      {factureVente ? (
                        <div className="flex items-center justify-end gap-1">
                          <FactureWhatsAppModal facture={factureVente} gieName={gieName} dict={dict} />
                          <DownloadPdfButton facture={factureVente} dict={dict} gieName={gieName} />
                        </div>
                      ) : (
                        <span className="text-foreground-muted">-</span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {journal.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm text-foreground-muted italic">
                    {t.empty}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

