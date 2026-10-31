'use client'

import { useState, useMemo } from 'react'
import { Edit, CheckCircle2, ArrowDownCircle, ArrowUpCircle, X } from 'lucide-react'
import { updateOperationOD, OperationOD } from './actions'
import { useUnite } from '@/components/DeviseProvider'

export default function EditOperationODModal({
  operation,
  imputations,
  comptes,
  onUpdated,
}: {
  operation: OperationOD
  imputations: { id: string; libelle: string; compte: string; categorie?: string; nature?: string }[]
  comptes: { id: string; nom: string; type_compte: string }[]
  onUpdated: () => void
}) {
  const unite = useUnite()
  const [isOpen, setIsOpen] = useState(false)
  const [typeOp, setTypeOp] = useState<'charge' | 'produit'>(operation.type_operation)
  const [dateOp, setDateOp] = useState(
    operation.date_operation ? operation.date_operation.slice(0, 10) : new Date().toISOString().slice(0, 10)
  )
  const [tiers, setTiers] = useState(operation.tiers || '')
  const [reference, setReference] = useState(operation.reference_piece || '')
  const [montant, setMontant] = useState(String(operation.montant || ''))
  const [libelle, setLibelle] = useState(operation.libelle || '')
  const [selectedImputationId, setSelectedImputationId] = useState(operation.imputation_id || '')
  const [customImputation, setCustomImputation] = useState(
    !operation.imputation_id && operation.imputation_libelle ? operation.imputation_libelle : ''
  )
  const [compteId, setCompteId] = useState(operation.compte_id || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Filtrer les imputations selon la nature (charge / produit)
  const relevantImputations = useMemo(() => {
    return imputations.filter((imp) => {
      if (typeOp === 'charge') return imp.nature === 'depense' || !imp.nature
      return imp.nature === 'recette' || !imp.nature
    })
  }, [imputations, typeOp])

  // Grouper les imputations par Rubrique (libelle) pour afficher les Postes (compte) sous chaque rubrique
  const relevantImputationsGrouped = useMemo(() => {
    const groups: { rubrique: string; postes: typeof relevantImputations }[] = []
    const map = new Map<string, typeof relevantImputations>()

    for (const imp of relevantImputations) {
      const rubrique = (imp.libelle || 'Autres').trim()
      if (!map.has(rubrique)) {
        const arr: typeof relevantImputations = []
        map.set(rubrique, arr)
        groups.push({ rubrique, postes: arr })
      }
      map.get(rubrique)!.push(imp)
    }

    for (const g of groups) {
      g.postes.sort((a, b) => (a.compte || a.libelle || '').localeCompare(b.compte || b.libelle || '', 'fr'))
    }

    groups.sort((a, b) => a.rubrique.localeCompare(b.rubrique, 'fr'))

    return groups
  }, [relevantImputations])

  const handleOpen = () => {
    setTypeOp(operation.type_operation)
    setDateOp(operation.date_operation ? operation.date_operation.slice(0, 10) : new Date().toISOString().slice(0, 10))
    setTiers(operation.tiers || '')
    setReference(operation.reference_piece || '')
    setMontant(String(operation.montant || ''))
    setLibelle(operation.libelle || '')
    setSelectedImputationId(operation.imputation_id || '')
    setCustomImputation(!operation.imputation_id && operation.imputation_libelle ? operation.imputation_libelle : '')
    setCompteId(operation.compte_id || '')
    setError('')
    setIsOpen(true)
  }

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

    const res = await updateOperationOD(operation.id, {
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
      onUpdated()
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="p-1 text-foreground-muted hover:text-primary rounded hover:bg-primary/10 transition-colors"
        title="Modifier cette écriture OD"
      >
        <Edit className="h-3.5 w-3.5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-xl rounded-2xl bg-surface border border-surface-border p-6 shadow-2xl animate-in fade-in-0 zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Modifier l&apos;Écriture OD
                </h3>
                <p className="text-xs text-foreground-muted">
                  Mettre à jour les informations de l&apos;opération diverse.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-foreground-muted hover:text-foreground p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
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
                    className="w-full rounded-lg border border-surface-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs font-mono"
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
                    Poste budgétaire (Classé par Rubrique)
                  </label>
                  <select
                    value={selectedImputationId}
                    onChange={(e) => {
                      setSelectedImputationId(e.target.value)
                      if (e.target.value) setCustomImputation('')
                    }}
                    className="w-full rounded-lg border border-surface-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs"
                  >
                    <option value="">Sélectionner un poste...</option>
                    {relevantImputationsGrouped.map((g) => (
                      <optgroup key={g.rubrique} label={`📁 Rubrique : ${g.rubrique}`}>
                        {g.postes.map((imp) => (
                          <option key={imp.id} value={imp.id}>
                            {imp.compte || imp.libelle}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Ou saisir un poste / rubrique personnalisé
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
                  Règlement par Compte de Trésorerie (Optionnel)
                </label>
                <select
                  value={compteId}
                  onChange={(e) => setCompteId(e.target.value)}
                  className="w-full rounded-lg border border-surface-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs"
                >
                  <option value="">-- Sans décaissement/encaissement direct (OD pure) --</option>
                  {comptes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom} ({c.type_compte})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-foreground-muted">
                  Si un compte est sélectionné, l&apos;opération sera synchronisée dans le journal de trésorerie associé.
                </p>
              </div>

              {/* Boutons actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold text-foreground-muted hover:text-foreground rounded-lg border border-surface-border hover:bg-background transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-primary rounded-lg shadow-xs hover:bg-primary-hover disabled:opacity-50 transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{loading ? "Enregistrement..." : "Valider la modification"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
