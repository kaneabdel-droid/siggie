'use client'

import { useState } from 'react'
import { Layers } from 'lucide-react'
import { setStockInitial } from './actions'

export default function SetStockInitialModal({
  campagneId,
  campagneNom,
  initialData,
  onSuccess,
  dict,
}: {
  campagneId: string
  campagneNom?: string
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
  const [quantite, setQuantite] = useState(initialData?.quantite ? String(initialData.quantite) : '')
  const [unite, setUnite] = useState(initialData?.unite || 'kg')
  const [valeurUnitaire, setValeurUnitaire] = useState(initialData?.valeur ? String(initialData.valeur) : '')
  const [dateStock, setDateStock] = useState(initialData?.date || new Date().toISOString().slice(0, 10))
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!quantite || Number(quantite) < 0) {
      setError("Veuillez saisir une quantité valide.")
      return
    }

    setLoading(true)
    setError('')

    const res = await setStockInitial({
      campagne_id: campagneId,
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

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={!campagneId}
        className="inline-flex items-center gap-x-2 rounded-md bg-surface border border-surface-border px-3 py-2 text-sm font-semibold text-foreground shadow-xs hover:bg-background disabled:opacity-50 transition-colors"
      >
        <Layers className="h-4 w-4 text-primary" />
        <span>{initialData ? "Modifier Stock Initial" : "Définir Stock Initial"}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black/60 transition-opacity" onClick={() => setIsOpen(false)} />

            <div className="relative transform overflow-hidden rounded-xl bg-surface text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-surface-border">
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
                  Définissez le stock de report antérieur ou l&apos;inventaire initial disponible au démarrage de cette campagne.
                </p>

                {error && (
                  <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-md text-xs text-danger">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
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
                      placeholder="Ex: 300"
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

