'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { getStockNature, deleteSortieStockNature, ProductStockSummary } from './actions'
import AddSortieModal from './AddSortieModal'
import EditSortieModal from './EditSortieModal'
import SetStockInitialModal from './SetStockInitialModal'
import { useUnite } from '@/components/DeviseProvider'
import DownloadPdfButton from '@/app/(dashboard)/facturation/DownloadPdfButton'
import FactureWhatsAppModal from '@/app/(dashboard)/facturation/FactureWhatsAppModal'
import { Trash2, Package, Filter, ArrowDownRight, ArrowUpRight } from 'lucide-react'

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
  const devise = useUnite()
  const [selectedCampagne, setSelectedCampagne] = useState(campagnes[0]?.id || '')
  const [clients, setClients] = useState(initialClients)
  const [journal, setJournal] = useState<any[]>([])
  const [soldeActuel, setSoldeActuel] = useState(0)
  const [uniteStock, setUniteStock] = useState('kg')
  const [campagneInfo, setCampagneInfo] = useState<any>(null)
  const [stockInitial, setStockInitial] = useState<any>(null)
  const [produits, setProduits] = useState<string[]>([])
  const [stocksParProduit, setStocksParProduit] = useState<Record<string, ProductStockSummary>>({})
  const [selectedProduitFilter, setSelectedProduitFilter] = useState<string>('all')

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
      setProduits(res.produits || [])
      setStocksParProduit(res.stocksParProduit || {})
    }
  }, [selectedCampagne])

  useEffect(() => {
    fetchStock()
  }, [fetchStock])

  // Filtrage du journal par produit
  const filteredJournal = useMemo(() => {
    if (selectedProduitFilter === 'all') return journal
    return journal.filter((m) => m.produit === selectedProduitFilter)
  }, [journal, selectedProduitFilter])

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

  const listeProduitsActifs = Object.values(stocksParProduit)

  return (
    <div className="space-y-6">
      {/* Sélecteur de campagne & Actions */}
      <div className="sm:flex sm:items-end sm:justify-between sm:gap-4">
        <div className="max-w-sm w-full">
          <label htmlFor="campagne" className="block text-sm font-medium text-foreground mb-1">
            {t.select_campaign || "Choisir une campagne"}
          </label>
          <select
            id="campagne"
            value={selectedCampagne}
            onChange={(e) => {
              setSelectedCampagne(e.target.value)
              setSelectedProduitFilter('all')
            }}
            className="block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-xs focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary sm:text-sm"
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
            produits={produits}
            stocksParProduit={stocksParProduit}
            selectedProduitDefault={selectedProduitFilter !== 'all' ? selectedProduitFilter : produits[0]}
            initialData={stockInitial}
            onSuccess={fetchStock}
            dict={dict}
          />
          <AddSortieModal
            campagneId={selectedCampagne}
            campagneInfo={campagneInfo}
            produits={produits}
            stocksParProduit={stocksParProduit}
            selectedProduitDefault={selectedProduitFilter !== 'all' ? selectedProduitFilter : produits[0]}
            uniteStock={uniteStock}
            membres={membres}
            clients={clients}
            onClientCreated={(c) => setClients((prev) => [...prev, c].sort((a, b) => a.nom.localeCompare(b.nom)))}
            onSuccess={fetchStock}
            dict={dict}
          />
        </div>
      </div>

      {loading && <div className="text-foreground-muted animate-pulse">{t.loading || "Chargement du stock..."}</div>}
      {error && <div className="text-danger">{error}</div>}

      {/* Cartes KPI par produit / Nature de produit */}
      {!loading && !error && (
        <div className="space-y-3">
          {/* Onglets de filtrage par produit si plus d'un produit existe */}
          {listeProduitsActifs.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs font-semibold text-foreground-muted flex items-center gap-1 mr-1">
                <Filter className="h-3.5 w-3.5" /> Filtrer :
              </span>
              <button
                type="button"
                onClick={() => setSelectedProduitFilter('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${selectedProduitFilter === 'all'
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-surface border border-surface-border text-foreground hover:bg-surface-hover'
                  }`}
              >
                Tous les produits ({listeProduitsActifs.length})
              </button>
              {listeProduitsActifs.map((pSum) => (
                <button
                  key={pSum.produit}
                  type="button"
                  onClick={() => setSelectedProduitFilter(pSum.produit)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${selectedProduitFilter === pSum.produit
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-surface border border-surface-border text-foreground hover:bg-surface-hover'
                    }`}
                >
                  {pSum.produit} : {Number(pSum.soldeActuel).toLocaleString(dateLocale)} {pSum.uniteStock}
                </button>
              ))}
            </div>
          )}

          {/* Grille des cartes des stocks par produit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listeProduitsActifs
              .filter((p) => selectedProduitFilter === 'all' || p.produit === selectedProduitFilter)
              .map((pSum) => {
                const isPaddy = pSum.produit.toLowerCase().includes('paddy') || pSum.produit.toLowerCase().includes('riz')
                const nbSacsEstime = isPaddy && pSum.uniteStock === 'kg' && pSum.soldeActuel > 0
                  ? Math.round(pSum.soldeActuel / 80)
                  : null

                return (
                  <div
                    key={pSum.produit}
                    className="overflow-hidden rounded-xl bg-surface border border-surface-border shadow-xs p-5 relative"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <Package className="h-5 w-5" />
                        </div>
                        <h4 className="text-base font-bold text-foreground">
                          {pSum.produit}
                        </h4>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        {pSum.nbMouvements} mvt(s)
                      </span>
                    </div>

                    {/* Solde actuel */}
                    <div className="mt-3">
                      <div className="text-xs text-foreground-muted font-medium">Stock disponible en magasin</div>
                      <div className="text-3xl font-black text-foreground tracking-tight flex items-baseline gap-1.5 mt-0.5">
                        <span>{Number(pSum.soldeActuel).toLocaleString(dateLocale, { maximumFractionDigits: 2 })}</span>
                        <span className="text-sm font-semibold text-primary">{pSum.uniteStock}</span>
                      </div>
                      {nbSacsEstime !== null && (
                        <div className="text-xs text-primary font-semibold mt-0.5">
                          ≈ {nbSacsEstime.toLocaleString(dateLocale)} sacs de 80 kg
                        </div>
                      )}
                    </div>

                    {/* Décomposition du stock */}
                    <div className="mt-4 pt-3 border-t border-surface-border grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <div className="text-foreground-muted text-[11px]">Stock Initial</div>
                        <div className="font-semibold text-foreground font-mono">
                          {Number(pSum.stockInitial.quantite).toLocaleString(dateLocale)}
                        </div>
                      </div>
                      <div>
                        <div className="text-success text-[11px] flex items-center gap-0.5">
                          <ArrowDownRight className="h-3 w-3" /> Entrées
                        </div>
                        <div className="font-semibold text-success font-mono">
                          +{Number(pSum.totalEntrees).toLocaleString(dateLocale)}
                        </div>
                      </div>
                      <div>
                        <div className="text-danger text-[11px] flex items-center gap-0.5">
                          <ArrowUpRight className="h-3 w-3" /> Sorties
                        </div>
                        <div className="font-semibold text-danger font-mono">
                          -{Number(pSum.totalSorties).toLocaleString(dateLocale)}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Tableau chronologique des mouvements */}
      {!loading && !error && (
        <div className="overflow-x-auto rounded-lg border border-surface-border bg-surface shadow-xs">
          <table className="min-w-full divide-y divide-surface-border">
            <thead className="bg-background">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers?.date || "Date"}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers?.type || "Type"}</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-foreground-muted uppercase tracking-wider">Tiers &amp; Produit</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers?.unit_price || "Prix unitaire"}</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers?.quantity || "Quantité stock"}</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider">{t.headers?.balance || "Solde en cours"}</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-foreground-muted uppercase tracking-wider print:hidden">Facture / Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border bg-surface">
              {filteredJournal.map((m, idx) => {
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

                const soldeAffiche = selectedProduitFilter === 'all'
                  ? (m.solde_produit != null ? m.solde_produit : m.solde)
                  : m.solde_produit

                return (
                  <tr key={m.id || idx} className="hover:bg-surface-hover transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">
                      {new Date(m.date).toLocaleDateString(dateLocale)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${isReport ? 'bg-purple-500/10 text-purple-600 ring-purple-500/20' :
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
                          {/* Badge Produit systématique pour identification sans ambiguïté */}
                          <span className="inline-flex items-center rounded bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-semibold border border-primary/20">
                            {m.produit}
                          </span>
                          {isVente && (
                            <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${isMembre ? 'bg-primary/10 text-primary' : 'bg-secondary/15 text-secondary'
                              }`}>
                              {isMembre ? 'Relevé Membre' : 'Relevé Client'}
                            </span>
                          )}
                        </div>

                        {/* Détails supplémentaires (variété, origine, contenance) */}
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          {m.type === 'entree' && !isReport && (
                            <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${m.origine_stock === 'materiel'
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

                          {isVente && (
                            <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                              m.origine_stock === 'materiel' || /moissonneuse|materiel|matériel|prestation/i.test(m.motif || '')
                                ? 'bg-secondary/15 text-secondary border border-secondary/20'
                                : 'bg-primary/10 text-primary border border-primary/20'
                            }`}>
                              {m.origine_stock === 'materiel' || /moissonneuse|materiel|matériel|prestation/i.test(m.motif || '')
                                ? 'CA Matériel'
                                : 'CA Exploitation'}
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

                          {m.motif && (
                            <span className="text-foreground-muted text-[11px] truncate max-w-xs">
                              {m.motif}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-sm text-right text-foreground-muted">
                      {Number(m.prix_unitaire).toLocaleString(dateLocale, { maximumFractionDigits: 0 })} {devise}/{m.unite_vente || m.unite || uniteStock}
                    </td>

                    <td className={`whitespace-nowrap px-6 py-4 text-sm text-right font-medium ${m.type === 'entree' ? 'text-success' : 'text-danger'}`}>
                      {m.type === 'entree' ? '+' : '-'}{Number(m.quantite).toLocaleString(dateLocale, { maximumFractionDigits: 2 })} {m.unite || uniteStock}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-sm text-right text-foreground font-semibold bg-background/50 font-mono">
                      {Number(soldeAffiche).toLocaleString(dateLocale, { maximumFractionDigits: 2 })} {m.unite || uniteStock}
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
                              produits={produits}
                              stocksParProduit={stocksParProduit}
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
              {filteredJournal.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm text-foreground-muted italic">
                    {selectedProduitFilter !== 'all'
                      ? `Aucun mouvement enregistré pour le produit "${selectedProduitFilter}".`
                      : (t.empty || "Aucun mouvement enregistré pour cette campagne.")}
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
