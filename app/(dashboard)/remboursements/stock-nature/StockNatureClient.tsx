'use client'

import { useState, useEffect, useCallback } from 'react'
import { getStockNature, deleteSortieStockNature } from './actions'
import AddSortieModal from './AddSortieModal'
import EditSortieModal from './EditSortieModal'
import SetStockInitialModal from './SetStockInitialModal'
import { useUnite } from '@/components/DeviseProvider'
import DownloadPdfButton from '@/app/(dashboard)/facturation/DownloadPdfButton'
import FactureWhatsAppModal from '@/app/(dashboard)/facturation/FactureWhatsAppModal'
import { Trash2 } from 'lucide-react'

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
  const [uniteStock, setUniteStock] = useState('kg')
  const [campagneInfo, setCampagneInfo] = useState<any>(null)
  const [stockInitial, setStockInitial] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const t = dict?.remboursements_pages?.stock_nature || {}
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
      setUniteStock(res.uniteStock || 'kg')
      setCampagneInfo(res.campagne || null)
      setStockInitial(res.stockInitial || null)
    }
  }, [selectedCampagne])

  useEffect(() => {
    fetchStock()
  }, [fetchStock])

  const handleDeleteSortie = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette écriture de sortie ? Le stock et le relevé de compte seront immédiatement recalculés.")) {
      return
    }

    setDeletingId(id)
    const res = await deleteSortieStockNature(id)
    setDeletingId(null)

    if (res?.error) {
      alert(res.error)
    } else {
      fetchStock()
    }
  }

  const typeLabel = (type: string, tiersType?: string) => {
    if (tiersType === 'report') return 'Stock initial'
    if (type === 'entree') return t?.type_entree || 'Entrée'
    if (type === 'vente') return t?.type_vente || 'Vente'
    return t?.type_ristourne || 'Ristourne'
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-end sm:justify-between sm:gap-4">
        <div className="max-w-sm w-full">
          <label htmlFor="campagne" className="block text-sm font-medium text-foreground mb-1">{t.select_campaign || "Choisir une campagne"}</label>
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

        <div className="mt-4 sm:mt-0 flex flex-wrap items-center gap-2">
          <SetStockInitialModal
            campagneId={selectedCampagne}
            campagneNom={campagneInfo?.nom}
            initialData={stockInitial}
            onSuccess={fetchStock}
            dict={dict}
          />
          <AddSortieModal
            campagneId={selectedCampagne}
            campagneInfo={campagneInfo}
            uniteStock={uniteStock}
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
          <dt className="text-sm font-medium text-white/80">{t.current_stock || "Stock actuel"}{campagneInfo?.produit_collecte ? ` (${campagneInfo.produit_collecte})` : ''}</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight">{Number(soldeActuel).toLocaleString(dateLocale, { maximumFractionDigits: 2 })} {uniteStock}</dd>
        </div>
      )}

      {loading && <div className="text-foreground-muted animate-pulse">{t.loading || "Chargement du stock..."}</div>}
      {error && <div className="text-danger">{error}</div>}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-lg border border-surface-border bg-surface shadow">
          <table className="min-w-full divide-y divide-surface-border">
            <thead className="bg-background">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers?.date || "Date"}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers?.type || "Type"}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers?.tiers || "Tiers"}</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers?.unit_price || "Prix unitaire"}</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers?.quantity || "Quantité stock"}</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers?.balance || "Solde en cours"}</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider print:hidden">Facture / Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border bg-surface">
              {journal.map((m, idx) => {
                const isVente = m.type === 'vente'
                const isRistourne = m.type === 'ristourne'
                const isSortieModifiable = isVente || isRistourne
                const isMembre = m.tiers_type === 'membre'
                const isReport = m.tiers_type === 'report'

                const quantiteFacture = m.quantite_vente != null ? m.quantite_vente : m.quantite
                const uniteFacture = m.unite_vente || m.unite || uniteStock

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
                      quantite: quantiteFacture,
                      unite: uniteFacture,
                      prix_unitaire: m.prix_unitaire,
                      montant_total: Number(quantiteFacture || 0) * Number(m.prix_unitaire || 0),
                      motif: m.motif,
                      nb_contenance: m.nb_contenance,
                    }
                  : null

                return (
                  <tr key={m.id || idx} className="hover:bg-surface-hover transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">
                      {new Date(m.date).toLocaleDateString(dateLocale)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                        isReport ? 'bg-purple-500/10 text-purple-600 ring-purple-500/20' :
                        m.type === 'entree' ? 'bg-success/10 text-success ring-success/20' :
                        m.type === 'vente' ? 'bg-primary/10 text-primary ring-primary/20' :
                        'bg-warning/10 text-warning ring-warning/20'
                      }`}>
                        {typeLabel(m.type, m.tiers_type)}
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

                        {/* Détails supplémentaires (variété, origine, contenance) */}
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          {m.type === 'entree' && !isReport && (
                            <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                              m.origine_stock === 'materiel'
                                ? 'bg-secondary/15 text-secondary border border-secondary/20'
                                : m.origine_stock === 'achat'
                                ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                                : 'bg-primary/10 text-primary border border-primary/20'
                            }`}>
                              {m.origine_stock === 'materiel'
                                ? 'Origine : Matériel'
                                : m.origine_stock === 'achat'
                                ? 'Origine : Achat'
                                : 'Origine : Exploitation'}
                            </span>
                          )}

                          {m.variete && (
                            <span className="inline-flex items-center rounded bg-background px-1.5 py-0.5 text-[10px] font-mono text-foreground-muted border border-surface-border">
                              Var. {m.variete}
                            </span>
                          )}

                          {isVente && m.unite_vente && m.unite_vente !== m.unite && (
                            <span className="inline-flex items-center rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 text-[10px] font-medium border border-amber-500/20">
                              Vendu : {Number(m.quantite_vente).toLocaleString(dateLocale)} {m.unite_vente}
                            </span>
                          )}

                          {isVente && m.nb_contenance && (
                            <span className="inline-flex items-center rounded bg-background px-1.5 py-0.5 text-[10px] font-mono text-foreground-muted border border-surface-border">
                              {m.nb_contenance} sacs
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-sm text-right text-foreground-muted">
                      {Number(m.prix_unitaire).toLocaleString(dateLocale, { maximumFractionDigits: 0 })}{unite}/{m.unite_vente || m.unite || uniteStock}
                    </td>

                    <td className={`whitespace-nowrap px-6 py-4 text-sm text-right font-medium ${m.type === 'entree' ? 'text-success' : 'text-danger'}`}>
                      {m.type === 'entree' ? '+' : '-'}{Number(m.quantite).toLocaleString(dateLocale, { maximumFractionDigits: 2 })} {m.unite || uniteStock}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-sm text-right text-foreground font-semibold bg-background/50">
                      {Number(m.solde).toLocaleString(dateLocale, { maximumFractionDigits: 2 })} {uniteStock}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-sm text-right print:hidden">
                      <div className="flex items-center justify-end gap-1.5">
                        {factureVente && (
                          <>
                            <FactureWhatsAppModal facture={factureVente} gieName={gieName} dict={dict} />
                            <DownloadPdfButton facture={factureVente} dict={dict} gieName={gieName} />
                          </>
                        )}

                        {isSortieModifiable && (
                          <>
                            <EditSortieModal
                              mouvement={m}
                              campagneInfo={campagneInfo}
                              onSuccess={fetchStock}
                              dict={dict}
                            />
                            <button
                              type="button"
                              onClick={() => handleDeleteSortie(m.id)}
                              disabled={deletingId === m.id}
                              className="p-1 rounded text-foreground-muted hover:text-danger hover:bg-background transition-colors disabled:opacity-50"
                              title="Supprimer cette sortie de stock"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {journal.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm text-foreground-muted italic">
                    {t.empty || "Aucun mouvement enregistré pour cette campagne."}
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
