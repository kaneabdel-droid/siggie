'use client'

import { useState } from 'react'
import { Edit2 } from 'lucide-react'
import { updatePaiementClient } from './actions'

export default function EditPaiementClientModal({
  mouvement,
  onSuccess,
  dict,
}: {
  mouvement: any
  onSuccess: () => void
  dict: any
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [montant, setMontant] = useState(String(mouvement.montant || ''))
  const [datePaiement, setDatePaiement] = useState(mouvement.date ? mouvement.date.slice(0, 10) : new Date().toISOString().slice(0, 10))
  const [motif, setMotif] = useState(mouvement.raw?.cleanMotif || '')
  const [refPiece, setRefPiece] = useState(mouvement.raw?.refPiece || '')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const m = Number(montant)
    if (!m || m <= 0) {
      setError("Veuillez saisir un montant valide.")
      return
    }

    setLoading(true)
    setError('')

    const res = await updatePaiementClient(mouvement.id, {
      montant: m,
      date_paiement: datePaiement,
      motif,
      reference_piece: refPiece || null,
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
        className="p-1 rounded text-foreground-muted hover:text-primary hover:bg-background transition-colors"
        title="Modifier ce paiement"
      >
        <Edit2 className="h-3.5 w-3.5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black/60 transition-opacity" onClick={() => setIsOpen(false)} />

            <div className="relative transform overflow-hidden rounded-xl bg-surface text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-surface-border">
              <div className="bg-surface px-4 pb-4 pt-5 sm:p-6">
                <h3 className="text-base font-bold text-foreground mb-1">
                  Modifier le Paiement Client
                </h3>
                <p className="text-xs text-foreground-muted mb-4">
                  Mode : <span className="font-semibold text-foreground uppercase">{mouvement.raw?.mode || 'Règlement'}</span>
                </p>

                {error && (
                  <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-md text-xs text-danger">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Montant reçu (FCFA) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      min="1"
                      value={montant}
                      onChange={(e) => setMontant(e.target.value)}
                      className="w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Date de paiement *
                    </label>
                    <input
                      type="date"
                      required
                      value={datePaiement}
                      onChange={(e) => setDatePaiement(e.target.value)}
                      className="w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Référence de pièce (N° Chèque / Bon / Reçu)
                    </label>
                    <input
                      type="text"
                      value={refPiece}
                      onChange={(e) => setRefPiece(e.target.value)}
                      placeholder="Ex: CHQ-84920"
                      className="w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Note / Motif
                    </label>
                    <input
                      type="text"
                      value={motif}
                      onChange={(e) => setMotif(e.target.value)}
                      placeholder="Ex: Acompte sur livraison"
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

