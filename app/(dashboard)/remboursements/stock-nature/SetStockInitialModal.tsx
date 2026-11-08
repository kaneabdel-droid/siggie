'use client'

import { useState, useEffect } from 'react'
import { Layers, Plus } from 'lucide-react'
import { setStockInitial } from './actions'

export default function SetStockInitialModal({
  campagneId,
  campagneNom,
  produits = [],
  stocksParProduit = {},
  selectedProduitDefault,
  initialData,
  onSuccess,
  dict,
}: {
  campagneId: string
  campagneNom?: string
  produits?: string[]
  stocksParProduit?: Record<string, any>
  selectedProduitDefault?: string
  initialData?: {
    quantite: number
    unite: string
    valeur?: number
    date?: string | null
  } | null
  onSuccess: () => void
  dict: any
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Liste des produits disponibles (au moins le produit par défaut ou 'Riz Paddy')
  const defaultProd = selectedProduitDefault || produits[0] || 'Riz Paddy'
  const [produit, setProduit] = useState(defaultProd)
  const [isCustomProduit, setIsCustomProduit] = useState(false)
  const [customProduitNom, setCustomProduitNom] = useState('')

  const [quantite, setQuantite] = useState('')
  const [unite, setUnite] = useState('kg')
  const [valeurUnitaire, setValeurUnitaire] = useState('')
  const [dateStock, setDateStock] = useState(new Date().toISOString().slice(0, 10))
  const [error, setError] = useState('')

  // Charger les données du produit sélectionné
  useEffect(() => {
    const currentProd = isCustomProduit ? customProduitNom : produit
    const existing = stocksParProduit[currentProd]?.stockInitial || (currentProd === defaultProd ? initialData : null)

    if (existing && existing.quantite > 0) {
      setQuantite(String(existing.quantite))
      setUnite(existing.unite || 'kg')
      setValeurUnitaire(existing.valeur ? String(existing.valeur) : '')
      if (existing.date) setDateStock(existing.date.slice(0, 10))
    } else {
      setQuantite('')
      setValeurUnitaire('')
    }
  }, [produit, isCustomProduit, customProduitNom, stocksParProduit, initialData, defaultProd])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const targetProduit = isCustomProduit ? customProduitNom.trim() : produit.trim()

    if (!targetProduit) {
      setError("Veuillez spécifier le nom du produit.")
      return
    }

    if (!quantite || Number(quantite) < 0) {
      setError("Veuillez saisir une quantité valide.")
      return
    }

    setLoading(true)
    setError('')

    const res = await setStockInitial({
      campagne_id: campagneId,
      produit: targetProduit,
      quantite: Number(quantite),
      unite,
      valeur_unitaire: Number(valeurUnitaire) || 0,
      date: dateStock,
    })

    setLoading(false)
    if (res?.error) {
      setError(res.error)
    } else {
      setIsOpen(false)
      onSuccess()
    }
  }

  // Produits ayant déjà un stock initial défini
  const initialStocksConfigures = Object.entries(stocksParProduit || {}).filter(
    ([_, val]) => val?.stockInitial && val.stockInitial.quantite > 0
  )

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={!campagneId}
        className="inline-flex items-center gap-x-2 rounded-md bg-surface border border-surface-border px-3 py-2 text-sm font-semibold text-foreground shadow-2xs hover:bg-background disabled:opacity-50 transition-colors"
      >
        <Layers className="h-4 w-4 text-primary" />
        <span>{initialStocksConfigures.length > 0 ? "Gérer Stocks Initiaux" : "Définir Stock Initial"}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black/60 transition-opacity" onClick={() => setIsOpen(false)} />

            <div className="relative transform overflow-hidden rounded-xl bg-surface text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-surface-border">
              <div className="bg-surface px-4 pb-4 pt-5 sm:p-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      Stock Initial / Inventaire d&apos;Ouverture
                    </h3>
                    <p className="text-xs text-foreground-muted">
                      Campagne : {campagneNom || 'En cours'}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-foreground-muted mb-4">
                  Définissez ou modifiez le stock de report antérieur ou l&apos;inventaire initial disponible au démarrage de cette campagne par nature de produit.
                </p>

                {/* Récapitulatif des stocks initiaux déjà enregistrés */}
                {initialStocksConfigures.length > 0 && (
                  <div className="mb-4 p-3 bg-surface-hover rounded-lg border border-surface-border text-xs">
                    <div className="font-semibold text-foreground mb-1.5 flex items-center justify-between">
                      <span>Stocks initiaux enregistrés :</span>
                    </div>
                    <div className="space-y-1">
                      {initialStocksConfigures.map(([pName, pVal]) => (
                        <div key={pName} className="flex items-center justify-between py-0.5 text-foreground-muted">
                          <span className="font-medium text-foreground">{pName}</span>
                          <span className="font-mono text-primary font-semibold">
                            {Number(pVal.stockInitial.quantite).toLocaleString('fr-FR')} {pVal.stockInitial.unite}
                            {pVal.stockInitial.valeur ? ` (à ${pVal.stockInitial.valeur} FCFA)` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-md text-xs text-danger">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Choix du produit */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Produit / Nature de produit *
                    </label>
                    {!isCustomProduit ? (
                      <div className="flex gap-2">
                        <select
                          value={produit}
                          onChange={(e) => setProduit(e.target.value)}
                          className="flex-1 rounded-md border border-surface-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
                        >
                          {produits.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                          <option value="__nouveau__">+ Ajouter une autre nature de produit...</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomProduit(true)
                            setCustomProduitNom('')
                          }}
                          className="px-2.5 py-2 rounded-md border border-surface-border bg-background text-xs font-medium text-foreground hover:bg-surface-hover"
                          title="Saisir un autre nom"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={customProduitNom}
                          onChange={(e) => setCustomProduitNom(e.target.value)}
                          placeholder="Ex: Maïs blanc, Oignon, Sorgho..."
                          className="flex-1 rounded-md border border-surface-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={() => setIsCustomProduit(false)}
                          className="px-3 py-2 rounded-md border border-surface-border bg-background text-xs text-foreground hover:bg-surface-hover"
                        >
                          Choisir existant
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Quantité Initiale *
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        min="0"
                        value={quantite}
                        onChange={(e) => setQuantite(e.target.value)}
                        placeholder="Ex: 5000"
                        className="w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Unité de mesure *
                      </label>
                      <select
                        value={unite}
                        onChange={(e) => setUnite(e.target.value)}
                        className="w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
                      >
                        <option value="kg">kg (Kilogrammes)</option>
                        <option value="sacs">sacs (Contenance)</option>
                        <option value="cageots">cageots</option>
                        <option value="cartons">cartons</option>
                        <option value="tonnes">tonnes</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Prix d&apos;évaluation unitaire (FCFA / {unite})
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={valeurUnitaire}
                      onChange={(e) => setValeurUnitaire(e.target.value)}
                      placeholder="Ex: 160"
                      className="w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
                    />
                    <p className="mt-1 text-[11px] text-foreground-muted">
                      Valeur d&apos;estimation unitaire du stock au bilan d&apos;ouverture.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Date d&apos;inventaire initial *
                    </label>
                    <input
                      type="date"
                      required
                      value={dateStock}
                      onChange={(e) => setDateStock(e.target.value)}
                      className="w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
                    />
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
                      {loading ? (dict?.common?.saving || "Enregistrement...") : (dict?.common?.save || "Enregistrer")}
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
