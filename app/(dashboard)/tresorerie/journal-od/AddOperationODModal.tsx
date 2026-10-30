'use client'

import { useState } from 'react'
import { Plus, CheckCircle2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { addOperationOD } from './actions'
import { useUnite } from '@/components/DeviseProvider'

export default function AddOperationODModal({
  imputations,
  comptes,
  onCreated,
}: {
  imputations: { id: string; libelle: string; compte: string; categorie?: string; nature?: string }[]
  comptes: { id: string; nom: string; type_compte: string }[]
  onCreated: () => void
}) {
  const unite = useUnite()
  const [isOpen, setIsOpen] = useState(false)
  const [typeOp, setTypeOp] = useState<'charge' | 'produit'>('charge')
  const [dateOp, setDateOp] = useState(new Date().toISOString().slice(0, 10))
  const [tiers, setTiers] = useState('')
  const [reference, setReference] = useState('')
  const [montant, setMontant] = useState('')
  const [libelle, setLibelle] = useState('')
  const [selectedImputationId, setSelectedImputationId] = useState('')
  const [customImputation, setCustomImputation] = useState('')
  const [compteId, setCompteId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Filtrer les imputations selon la nature (charge / produit)
  const relevantImputations = imputations.filter((imp) => {
    if (typeOp === 'charge') return imp.nature === 'depense' || !imp.nature
    return imp.nature === 'recette' || !imp.nature
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const numMontant = Number(montant)
    if (!numMontant || numMontant <= 0) {
      setError("Veuillez saisir un montant valide supérieur à 0.")
      return
    }
    if (!libelle.trim()) {
      setError("Le libellé de l'opération est obligatoire.")
      return
    }

    setLoading(true)
    setError('')

    // Résoudre le libellé d'imputation
    let resolvedImpLib = customImputation.trim()
    if (selectedImputationId) {
      const found = imputations.find((i) => i.id === selectedImputationId)
      if (found) {
        resolvedImpLib = found.compte ? `${found.libelle} — ${found.compte}` : found.libelle
      }
    }
    if (!resolvedImpLib) {
      resolvedImpLib = typeOp === 'charge' ? 'Frais généraux' : 'Autres produits'
    }

    const res = await addOperationOD({
      type_operation: typeOp,
      date_operation: dateOp,
      tiers: tiers.trim() || null,
      reference_piece: reference.trim() || null,
      montant: numMontant,
      libelle: libelle.trim(),
      imputation_id: selectedImputationId || null,
      imputation_libelle: resolvedImpLib,
      compte_id: compteId || null,
    })

    setLoading(false)

    if (res?.error) {
      setError(res.error)
    } else {
      setIsOpen(false)
      setTiers('')
      setReference('')
      setMontant('')
      setLibelle('')
      setSelectedImputationId('')
      setCustomImputation('')
      setCompteId('')
      onCreated()
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary-hover transition-colors"
      >
        <Plus className="h-4 w-4" />
        <span>Nouvelle Écriture OD</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-xl rounded-2xl bg-surface border border-surface-border p-6 shadow-2xl animate-in fade-in-0 zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Nouvelle Écriture au Journal OD
                </h3>
                <p className="text-xs text-foreground-muted">
                  Frais généraux (électricité, loyers, carburant...) et autres produits d&apos;exploitation.
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-3 p-3 bg-danger/10 border border-danger/20 rounded-md text-xs text-danger">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* Type d'opération (Boutons à bascule) */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Type d&apos;opération *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setTypeOp('charge')
                      setSelectedImputationId('')
                    }}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-bold transition-colors ${
                      typeOp === 'charge'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-600 shadow-2xs'
                        : 'border-surface-border bg-background text-foreground-muted hover:text-foreground'
                    }`}
                  >
                    <ArrowDownCircle className="h-4 w-4" />
                    <span>Frais Général / Charge (Dépense)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTypeOp('produit')
                      setSelectedImputationId('')
                    }}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-bold transition-colors ${
                      typeOp === 'produit'
                        ? 'bg-success/15 border-success text-success shadow-2xs'
                        : 'border-surface-border bg-background text-foreground-muted hover:text-foreground'
                    }`}
                  >
                    <ArrowUpCircle className="h-4 w-4" />
                    <span>Autre Produit / Recette</span>
                  </button>
                </div>
              </div>

              {/* Date & Montant */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Date de l&apos;opération *
                  </label>
                  <input
                    type="date"
                    required
                    value={dateOp}
                    onChange={(e) => setDateOp(e.target.value)}
                    className="w-full rounded-lg border border-surface-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Montant ({unite}) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={montant}
                    onChange={(e) => setMontant(e.target.value)}
                    placeholder="Ex: 85000"
                    className="w-full rounded-lg border border-surface-border bg-background px-3 py-2 text-sm font-semibold text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs"
                  />
                </div>
              </div>

              {/* Tiers & Référence */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Tiers (Bénéficiaire / Émetteur)
                  </label>
                  <input
                    type="text"
                    value={tiers}
                    onChange={(e) => setTiers(e.target.value)}
                    placeholder="Ex: Senelec, SDE, Propriétaire magasin..."
                    className="w-full rounded-lg border border-surface-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Référence de la pièce / Facture N°
                  </label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Ex: FACT-2026-088, QUITT-12..."
                    className="w-full rounded-lg border border-surface-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs"
                  />
                </div>
              </div>

              {/* Libellé */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Libellé / Description de l&apos;opération *
                </label>
                <input
                  type="text"
                  required
                  value={libelle}
                  onChange={(e) => setLibelle(e.target.value)}
                  placeholder="Ex: Facture électricité Senelec station pompage, Loyer hangar..."
                  className="w-full rounded-lg border border-surface-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs"
                />
              </div>

              {/* Imputation budgétaire */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Imputation budgétaire existante
                  </label>
                  <select
                    value={selectedImputationId}
                    onChange={(e) => {
                      setSelectedImputationId(e.target.value)
                      if (e.target.value) setCustomImputation('')
                    }}
                    className="w-full rounded-lg border border-surface-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs"
                  >
                    <option value="">Sélectionner une rubrique...</option>
                    {relevantImputations.map((imp) => (
                      <option key={imp.id} value={imp.id}>
                        {imp.libelle} — {imp.compte}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Ou saisir une rubrique personnalisée
                  </label>
                  <input
                    type="text"
                    value={customImputation}
                    onChange={(e) => {
                      setCustomImputation(e.target.value)
                      if (e.target.value) setSelectedImputationId('')
                    }}
                    placeholder="Ex: Électricité, Loyer, Entretien..."
                    className="w-full rounded-lg border border-surface-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs"
                  />
                </div>
              </div>

              {/* Compte de trésorerie (Optionnel) */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Compte de trésorerie (Optionnel — si décaissement/encaissement direct)
                </label>
                <select
                  value={compteId}
                  onChange={(e) => setCompteId(e.target.value)}
                  className="w-full rounded-lg border border-surface-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs"
                >
                  <option value="">Aucun compte (Écriture OD pure d&apos;engagement)</option>
                  {comptes.map((cp) => (
                    <option key={cp.id} value={cp.id}>
                      {cp.nom} ({cp.type_compte})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-foreground-muted">
                  Sélectionnez une caisse ou banque si l&apos;opération a été immédiatement réglée avec les fonds du GIE.
                </p>
              </div>

              {/* Actions */}
              <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={loading}
                  className="rounded-lg border border-surface-border bg-surface px-4 py-2 text-xs font-semibold text-foreground hover:bg-background transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-primary-hover transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{loading ? "Enregistrement..." : "Enregistrer dans le Journal OD"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
