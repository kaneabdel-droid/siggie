'use client'

import { useState, useMemo } from 'react'
import { Plus, Calculator, Info } from 'lucide-react'
import { addSortieStockNature } from './actions'
import { addClient } from '../../bilans/releve-client/actions'

const NEW_CLIENT_VALUE = '__new__'

export default function AddSortieModal({
  campagneId,
  campagneInfo,
  produits = [],
  stocksParProduit = {},
  selectedProduitDefault,
  uniteStock = 'kg',
  membres,
  clients,
  onClientCreated,
  onSuccess,
  dict,
}: {
  campagneId: string
  campagneInfo?: any
  produits?: string[]
  stocksParProduit?: Record<string, any>
  selectedProduitDefault?: string
  uniteStock?: string
  membres: any[]
  clients: { id: string; nom: string }[]
  onClientCreated: (client: { id: string; nom: string }) => void
  onSuccess: () => void
  dict: any
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [typeSortie, setTypeSortie] = useState<'vente' | 'ristourne'>('vente')
  const [tiersType, setTiersType] = useState('membre')
  const [clientId, setClientId] = useState('')
  const [newClientNom, setNewClientNom] = useState('')

  // Produit à déduire
  const fallbackProduit = selectedProduitDefault || produits[0] || campagneInfo?.produit_collecte || 'Riz Paddy'
  const [produitChoisi, setProduitChoisi] = useState(fallbackProduit)

  // Unité et quantités
  const [uniteVente, setUniteVente] = useState('kg')
  const [uniteStockCible, setUniteStockCible] = useState(uniteStock || 'kg')
  const [quantiteVente, setQuantiteVente] = useState('')
  const [prixUnitaire, setPrixUnitaire] = useState('')
  const [nbContenance, setNbContenance] = useState('')
  const [poidsKgStock, setPoidsKgStock] = useState('')

  const [dateSortie, setDateSortie] = useState(new Date().toISOString().slice(0, 10))
  const [motif, setMotif] = useState('')
  const [origineStock, setOrigineStock] = useState<'exploitation' | 'materiel'>('exploitation')
  const [error, setError] = useState('')

  const t = dict?.remboursements_pages?.stock_nature?.form || {}

  const currentProductStock = stocksParProduit[produitChoisi]
  const stockDispo = currentProductStock ? currentProductStock.soldeActuel : 0
  const isPaddy = produitChoisi.toLowerCase().includes('paddy') || produitChoisi.toLowerCase().includes('riz')

  // Calcul du montant total
  const montantTotal = useMemo(() => {
    const q = Number(quantiteVente) || 0
    const pu = Number(prixUnitaire) || 0
    return q * pu
  }, [quantiteVente, prixUnitaire])

  // Détection du besoin de conversion
  const isVenteEnKgEtStockEnSacs = uniteVente === 'kg' && uniteStockCible === 'sacs'
  const isVenteEnSacsEtStockEnKg = (uniteVente === 'sacs' || uniteVente === 'cageots' || uniteVente === 'cartons') && uniteStockCible === 'kg'

  // Suggestions automatiques de sacs
  const suggestion80kg = useMemo(() => {
    const q = Number(quantiteVente)
    if (!q || q <= 0) return null
    return Math.round(q / 80)
  }, [quantiteVente])

  const suggestion50kg = useMemo(() => {
    const q = Number(quantiteVente)
    if (!q || q <= 0) return null
    return Math.round(q / 50)
  }, [quantiteVente])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    const qVente = Number(quantiteVente)
    const pu = Number(prixUnitaire)

    if (!qVente || qVente <= 0) {
      setError("Veuillez saisir une quantité vendue valide.")
      return
    }

    if (pu < 0) {
      setError("Le prix unitaire ne peut pas être négatif.")
      return
    }

    // Calcul de la quantité exacte déduite du stock physique
    let quantiteDeduitStock = qVente
    let nbContenanceFinal: number | undefined = undefined

    if (isVenteEnKgEtStockEnSacs) {
      const sacs = Number(nbContenance)
      if (!sacs || sacs <= 0) {
        setError("Veuillez renseigner le nombre de contenances / sacs correspondant à déduire du stock.")
        return
      }
      quantiteDeduitStock = sacs
      nbContenanceFinal = sacs
    } else if (isVenteEnSacsEtStockEnKg) {
      const kg = Number(poidsKgStock)
      if (!kg || kg <= 0) {
        setError("Veuillez renseigner le poids total en kg équivalent à déduire du stock.")
        return
      }
      quantiteDeduitStock = kg
      nbContenanceFinal = qVente
    } else if (nbContenance) {
      nbContenanceFinal = Number(nbContenance)
    }

    setLoading(true)
    const formData = new FormData(e.currentTarget)

    let resolvedClientId = clientId
    if (tiersType === 'client' && clientId === NEW_CLIENT_VALUE) {
      const clientRes = await addClient(newClientNom)
      if (clientRes?.error || !clientRes.client) {
        setLoading(false)
        setError(clientRes?.error || "Erreur lors de la création du client")
        return
      }
      resolvedClientId = clientRes.client.id
      onClientCreated(clientRes.client)
    }

    const res = await addSortieStockNature({
      campagne_id: campagneId,
      produit: produitChoisi,
      type_sortie: typeSortie,
      tiers_type: tiersType,
      membre_id: (formData.get('membre_id') as string) || undefined,
      client_id: tiersType === 'client' ? resolvedClientId : undefined,
      quantite: quantiteDeduitStock,
      prix_unitaire: pu,
      unite: uniteStockCible,
      unite_vente: uniteVente,
      quantite_vente: qVente,
      nb_contenance: nbContenanceFinal,
      motif: motif || undefined,
      date_sortie: dateSortie,
      origine_stock: origineStock,
    })

    setLoading(false)
    if (res?.error) {
      setError(res.error)
    } else {
      setIsOpen(false)
      setClientId('')
      setNewClientNom('')
      setQuantiteVente('')
      setPrixUnitaire('')
      setNbContenance('')
      setPoidsKgStock('')
      setMotif('')
      onSuccess()
    }
  }

  // Liste des produits disponibles dans la campagne
  const listeOptionsProduits = produits.length > 0 ? produits : [campagneInfo?.produit_collecte || 'Riz Paddy']

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setProduitChoisi(selectedProduitDefault || produits[0] || campagneInfo?.produit_collecte || 'Riz Paddy')
          setUniteStockCible(currentProductStock?.uniteStock || uniteStock || 'kg')
          setIsOpen(true)
        }}
        disabled={!campagneId}
        className="inline-flex items-center gap-x-2 rounded-md bg-secondary px-3 py-2 text-sm font-semibold text-white shadow-2xs hover:bg-secondary/90 disabled:opacity-50 transition-colors"
      >
        <Plus className="-ml-0.5 h-5 w-5" aria-hidden="true" />
        <span>{dict?.remboursements_pages?.stock_nature?.add_sortie || "Enregistrer une sortie"}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black/60 transition-opacity" onClick={() => setIsOpen(false)} />

            <div className="relative transform overflow-hidden rounded-xl bg-surface text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-surface-border">
              <div className="bg-surface px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-bold leading-6 text-foreground mb-1">
                  {typeSortie === 'vente' ? "Enregistrer une Vente de Stock" : "Enregistrer une Ristourne de Stock"}
                </h3>
                <p className="text-xs text-foreground-muted mb-4">
                  Produit : <span className="font-semibold text-foreground">{produitChoisi}</span> • Stock disponible : <span className="font-semibold text-primary">{Number(stockDispo).toLocaleString('fr-FR')} {currentProductStock?.uniteStock || uniteStockCible}</span>
                  {isPaddy && currentProductStock?.uniteStock === 'kg' && stockDispo > 0 && (
                    <span className="text-foreground-muted"> (~{Math.round(stockDispo / 80)} sacs de 80kg)</span>
                  )}
                </p>

                {error && (
                  <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-md text-xs text-danger">
                    {error}
                  </div>
                )}

                <form id="add-sortie-form" onSubmit={handleSubmit} className="space-y-4">
                  {/* Sélection du produit */}
                  {listeOptionsProduits.length > 1 && (
                    <div>
                      <label htmlFor="produit" className="block text-xs font-semibold text-foreground mb-1">
                        Produit à déduire *
                      </label>
                      <select
                        id="produit"
                        value={produitChoisi}
                        onChange={(e) => {
                          const p = e.target.value
                          setProduitChoisi(p)
                          const pSummary = stocksParProduit[p]
                          if (pSummary?.uniteStock) {
                            setUniteStockCible(pSummary.uniteStock)
                          }
                        }}
                        className="block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
                      >
                        {listeOptionsProduits.map((p) => {
                          const pSum = stocksParProduit[p]
                          return (
                            <option key={p} value={p}>
                              {p} {pSum ? `(Dispo: ${Number(pSum.soldeActuel).toLocaleString('fr-FR')} ${pSum.uniteStock})` : ''}
                            </option>
                          )
                        })}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="type_sortie" className="block text-xs font-semibold text-foreground mb-1">
                        Type d&apos;opération *
                      </label>
                      <select
                        name="type_sortie"
                        id="type_sortie"
                        value={typeSortie}
                        onChange={(e) => setTypeSortie(e.target.value as any)}
                        className="block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
                      >
                        <option value="vente">Vente</option>
                        <option value="ristourne">Ristourne physique</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="tiers_type" className="block text-xs font-semibold text-foreground mb-1">
                        Bénéficiaire / Acheteur *
                      </label>
                      <select
                        name="tiers_type"
                        id="tiers_type"
                        value={tiersType}
                        onChange={(e) => setTiersType(e.target.value)}
                        className="block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
                      >
                        <option value="membre">Membre du GIE</option>
                        <option value="client">Client externe</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Origine & Affectation du stock vendu *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setOrigineStock('exploitation')}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold border transition text-left ${origineStock === 'exploitation'
                            ? 'bg-primary/10 border-primary text-primary font-bold ring-1 ring-primary'
                            : 'bg-background border-surface-border text-foreground-muted hover:text-foreground'
                          }`}
                      >
                        <div>🌾 Exploitation Agricole</div>
                        <div className="text-[10px] font-normal opacity-75 mt-0.5">
                          Remboursements factures de campagne
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrigineStock('materiel')}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold border transition text-left ${origineStock === 'materiel'
                            ? 'bg-primary/10 border-primary text-primary font-bold ring-1 ring-primary'
                            : 'bg-background border-surface-border text-foreground-muted hover:text-foreground'
                          }`}
                      >
                        <div>🚜 Matériel & Équipements</div>
                        <div className="text-[10px] font-normal opacity-75 mt-0.5">
                          Règlements prestations (moissonneuse)
                        </div>
                      </button>
                    </div>
                  </div>

                  {tiersType === 'membre' ? (
                    <div>
                      <label htmlFor="membre_id" className="block text-xs font-semibold text-foreground mb-1">
                        Membre *
                      </label>
                      <select
                        name="membre_id"
                        id="membre_id"
                        required
                        className="block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
                      >
                        <option value="">Sélectionner un membre</option>
                        {membres.map((m) => (
                          <option key={m.id} value={m.id}>{m.prenom} {m.nom}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label htmlFor="client_id" className="block text-xs font-semibold text-foreground mb-1">
                        Client externe *
                      </label>
                      <select
                        id="client_id"
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        required
                        className="block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
                      >
                        <option value="">Sélectionner un client</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>{c.nom}</option>
                        ))}
                        <option value={NEW_CLIENT_VALUE}>+ Nouveau client externe...</option>
                      </select>

                      {clientId === NEW_CLIENT_VALUE && (
                        <div className="mt-2">
                          <input
                            type="text"
                            required
                            value={newClientNom}
                            onChange={(e) => setNewClientNom(e.target.value)}
                            placeholder="Nom du nouveau client"
                            className="block w-full rounded-md border border-primary bg-background px-3 py-2 text-sm text-foreground focus:outline-hidden shadow-2xs"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Unités de vente et de stock */}
                  <div className="p-3 bg-surface-hover/50 rounded-lg border border-surface-border space-y-3">
                    <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span>Quantité vendue & Unités</span>
                      <span className="text-[11px] text-foreground-muted font-normal">
                        Unité stock : <span className="font-semibold text-primary">{uniteStockCible}</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-1">
                          Quantité vendue *
                        </label>
                        <input
                          type="number"
                          step="any"
                          required
                          min="0.01"
                          value={quantiteVente}
                          onChange={(e) => setQuantiteVente(e.target.value)}
                          placeholder="Ex: 5000"
                          className="w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-1">
                          Unité de vente *
                        </label>
                        <select
                          value={uniteVente}
                          onChange={(e) => setUniteVente(e.target.value)}
                          className="w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
                        >
                          <option value="kg">kg (Poids)</option>
                          <option value="sacs">sacs (Contenance)</option>
                          <option value="cageots">cageots</option>
                          <option value="cartons">cartons</option>
                          <option value="tonnes">tonnes</option>
                        </select>
                      </div>
                    </div>

                    {/* Vente en kg et stock en sacs (ou paddy) : demander la contenance en sacs */}
                    {isVenteEnKgEtStockEnSacs && (
                      <div className="p-2.5 bg-primary/10 rounded-md border border-primary/20 space-y-2">
                        <div className="flex items-start gap-2">
                          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <div className="text-xs text-foreground">
                            <span className="font-semibold">Conversion Stock :</span> La vente est exprimée en <span className="font-semibold">kg</span>. Précisez le nombre de sacs à déduire du stock physique :
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-primary mb-1">
                            Nombre de sacs à déduire *
                          </label>
                          <input
                            type="number"
                            step="any"
                            required
                            min="1"
                            value={nbContenance}
                            onChange={(e) => setNbContenance(e.target.value)}
                            placeholder="Ex: 62 sacs"
                            className="w-full rounded-md border border-primary bg-background px-3 py-2 text-sm text-foreground focus:outline-hidden font-mono shadow-2xs"
                          />
                        </div>

                        {(suggestion80kg || suggestion50kg) && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-foreground-muted">
                            <span>Suggestions rapides :</span>
                            {suggestion80kg && (
                              <button
                                type="button"
                                onClick={() => setNbContenance(String(suggestion80kg))}
                                className="px-2 py-0.5 rounded bg-background border border-surface-border text-primary hover:border-primary font-mono transition-colors"
                              >
                                ~{suggestion80kg} sacs (base 80kg)
                              </button>
                            )}
                            {suggestion50kg && (
                              <button
                                type="button"
                                onClick={() => setNbContenance(String(suggestion50kg))}
                                className="px-2 py-0.5 rounded bg-background border border-surface-border text-primary hover:border-primary font-mono transition-colors"
                              >
                                ~{suggestion50kg} sacs (base 50kg)
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Vente en contenance (sacs) et stock en kg : demander le poids total en kg */}
                    {isVenteEnSacsEtStockEnKg && (
                      <div className="p-2.5 bg-amber-500/10 rounded-md border border-amber-500/20 space-y-2">
                        <div className="flex items-start gap-2">
                          <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                          <div className="text-xs text-foreground">
                            <span className="font-semibold">Conversion Stock :</span> La vente est en <span className="font-semibold">{uniteVente}</span> alors que le stock est suivi en <span className="font-semibold">kg</span>. Renseignez le poids total à déduire :
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">
                            Poids total en kg à déduire du stock *
                          </label>
                          <input
                            type="number"
                            step="any"
                            required
                            min="1"
                            value={poidsKgStock}
                            onChange={(e) => setPoidsKgStock(e.target.value)}
                            placeholder="Ex: 4000 kg"
                            className="w-full rounded-md border border-amber-500 bg-background px-3 py-2 text-sm text-foreground focus:outline-hidden font-mono shadow-2xs"
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-1">
                          Prix unitaire (FCFA / {uniteVente}) *
                        </label>
                        <input
                          type="number"
                          step="any"
                          required
                          min="0"
                          value={prixUnitaire}
                          onChange={(e) => setPrixUnitaire(e.target.value)}
                          placeholder="Ex: 300"
                          className="w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-1">
                          Montant total
                        </label>
                        <div className="flex items-center h-[38px] px-3 rounded-md bg-background border border-surface-border font-mono font-bold text-foreground text-sm">
                          {montantTotal.toLocaleString('fr-FR')} FCFA
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="date_sortie" className="block text-xs font-semibold text-foreground mb-1">
                        Date d&apos;opération *
                      </label>
                      <input
                        type="date"
                        name="date_sortie"
                        id="date_sortie"
                        required
                        value={dateSortie}
                        onChange={(e) => setDateSortie(e.target.value)}
                        className="block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
                      />
                    </div>

                    <div>
                      <label htmlFor="motif" className="block text-xs font-semibold text-foreground mb-1">
                        Motif / Référence
                      </label>
                      <input
                        type="text"
                        name="motif"
                        id="motif"
                        value={motif}
                        onChange={(e) => setMotif(e.target.value)}
                        placeholder="Ex: Facture Vente N° 045"
                        className="block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="rounded-md border border-surface-border bg-surface px-3 py-2 text-sm font-semibold text-foreground hover:bg-background transition-colors"
                    >
                      {dict?.common?.cancel || "Annuler"}
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="rounded-md bg-secondary px-3 py-2 text-sm font-semibold text-white shadow-2xs hover:bg-secondary/90 disabled:opacity-50 transition-colors"
                    >
                      {loading ? (dict?.common?.saving || "Enregistrement...") : (dict?.common?.save || "Valider l'opération")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
