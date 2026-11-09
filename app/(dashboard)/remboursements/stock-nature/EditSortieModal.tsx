'use client'

import { useState, useMemo } from 'react'
import { Edit2, Calculator, Info } from 'lucide-react'
import { updateSortieStockNature } from './actions'

export default function EditSortieModal({
  mouvement,
  campagneInfo,
  produits = [],
  stocksParProduit = {},
  onSuccess,
  dict,
}: {
  mouvement: any
  campagneInfo?: any
  produits?: string[]
  stocksParProduit?: Record<string, any>
  onSuccess: () => void
  dict: any
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const isVente = mouvement.type === 'vente'
  const fallbackProduit = mouvement.produit || campagneInfo?.produit_collecte || 'Riz Paddy'
  const [produitChoisi, setProduitChoisi] = useState(fallbackProduit)

  // Unité et valeurs existantes
  const [uniteVente, setUniteVente] = useState(mouvement.unite_vente || mouvement.unite || 'kg')
  const [uniteStockCible, setUniteStockCible] = useState(mouvement.unite || 'kg')
  const [quantiteVente, setQuantiteVente] = useState(String(mouvement.quantite_vente || mouvement.quantite || ''))
  const [prixUnitaire, setPrixUnitaire] = useState(String(mouvement.prix_unitaire || ''))
  const [nbContenance, setNbContenance] = useState(mouvement.nb_contenance ? String(mouvement.nb_contenance) : '')
  const [poidsKgStock, setPoidsKgStock] = useState('')
  const [dateSortie, setDateSortie] = useState(mouvement.date ? mouvement.date.slice(0, 10) : new Date().toISOString().slice(0, 10))
  const [motif, setMotif] = useState(mouvement.motif || '')
  const [error, setError] = useState('')

  const isPaddy = produitChoisi.toLowerCase().includes('paddy') || produitChoisi.toLowerCase().includes('riz')

  const montantTotal = useMemo(() => {
    const q = Number(quantiteVente) || 0
    const pu = Number(prixUnitaire) || 0
    return q * pu
  }, [quantiteVente, prixUnitaire])

  const isVenteEnKgEtStockEnSacs = uniteVente === 'kg' && uniteStockCible === 'sacs'
  const isVenteEnSacsEtStockEnKg = (uniteVente === 'sacs' || uniteVente === 'cageots' || uniteVente === 'cartons') && uniteStockCible === 'kg'

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

  async function handleSubmit(e: React.FormEvent) {
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

    let quantiteDeduitStock = qVente
    let nbContenanceFinal: number | undefined = undefined

    if (isVenteEnKgEtStockEnSacs) {
      const sacs = Number(nbContenance)
      if (!sacs || sacs <= 0) {
        setError("Veuillez renseigner le nombre de sacs à déduire du stock.")
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

    const res = await updateSortieStockNature(mouvement.id, {
      quantite: quantiteDeduitStock,
      prix_unitaire: pu,
      produit: produitChoisi,
      unite: uniteStockCible,
      unite_vente: uniteVente,
      quantite_vente: qVente,
      nb_contenance: nbContenanceFinal,
      motif: motif || undefined,
      date_sortie: dateSortie,
    })

    setLoading(false)
    if (res?.error) {
      setError(res.error)
    } else {
      setIsOpen(false)
      onSuccess()
    }
  }

  const listeOptionsProduits = produits.length > 0 ? produits : [mouvement.produit || 'Riz Paddy']

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setProduitChoisi(mouvement.produit || fallbackProduit)
          setIsOpen(true)
        }}
        className="p-1 rounded text-foreground-muted hover:text-primary hover:bg-background transition-colors"
        title="Modifier cette écriture"
      >
        <Edit2 className="h-3.5 w-3.5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black/60 transition-opacity" onClick={() => setIsOpen(false)} />

            <div className="relative transform overflow-hidden rounded-xl bg-surface text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-surface-border">
              <div className="bg-surface px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-bold leading-6 text-foreground mb-1">
                  Modifier l&apos;écriture de {isVente ? "Vente" : "Sortie"}
                </h3>
                <p className="text-xs text-foreground-muted mb-4">
                  Tiers : <span className="font-semibold text-foreground">{mouvement.tiers}</span> • Produit : <span className="font-semibold text-primary">{produitChoisi}</span>
                </p>

                {error && (
                  <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-md text-xs text-danger">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Produit concerné */}
                  {listeOptionsProduits.length > 1 && (
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Produit concerné *
                      </label>
                      <select
                        value={produitChoisi}
                        onChange={(e) => setProduitChoisi(e.target.value)}
                        className="block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
                      >
                        {listeOptionsProduits.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Bloc Quantités & Unités */}
                  <div className="p-3 bg-surface-hover/50 rounded-lg border border-surface-border space-y-3">
                    <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span>Quantité & Unités</span>
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

                    {isVenteEnKgEtStockEnSacs && (
                      <div className="p-2.5 bg-primary/10 rounded-md border border-primary/20 space-y-2">
                        <div className="flex items-start gap-2">
                          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <div className="text-xs text-foreground">
                            <span className="font-semibold">Conversion Stock :</span> La vente est en <span className="font-semibold">kg</span>. Précisez le nombre de sacs à déduire du stock physique :
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
                      <label htmlFor="edit_date_sortie" className="block text-xs font-semibold text-foreground mb-1">
                        Date d&apos;opération *
                      </label>
                      <input
                        type="date"
                        id="edit_date_sortie"
                        required
                        value={dateSortie}
                        onChange={(e) => setDateSortie(e.target.value)}
                        className="block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
                      />
                    </div>

                    <div>
                      <label htmlFor="edit_motif" className="block text-xs font-semibold text-foreground mb-1">
                        Motif / Référence
                      </label>
                      <input
                        type="text"
                        id="edit_motif"
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
                      className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-2xs hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {loading ? (dict?.common?.saving || "Mise à jour...") : (dict?.common?.save || "Enregistrer")}
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
