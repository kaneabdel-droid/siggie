'use client'

import { useState, useEffect } from 'react'
import { Wallet, CheckCircle2 } from 'lucide-react'
import { addPaiementFournisseur, getContextePaiementFournisseur } from './actions'
import { useUnite } from '@/components/DeviseProvider'

export default function AddPaiementFournisseurModal({
  fournisseurNom,
  soldeActuel,
  onSuccess,
  dict,
}: {
  fournisseurNom: string
  soldeActuel: number
  onSuccess: () => void
  dict: any
}) {
  const unite = useUnite()
  const [isOpen, setIsOpen] = useState(false)
  const [comptes, setComptes] = useState<{ id: string; nom: string; type_compte: string }[]>([])
  const [compteId, setCompteId] = useState('')
  const [montant, setMontant] = useState(soldeActuel > 0 ? String(soldeActuel) : '')
  const [modePaiement, setModePaiement] = useState<'espece' | 'cheque' | 'virement' | 'bon' | 'mobile_money' | 'autre'>('espece')
  const [referencePiece, setReferencePiece] = useState('')
  const [datePaiement, setDatePaiement] = useState(new Date().toISOString().slice(0, 10))
  const [motif, setMotif] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      getContextePaiementFournisseur().then((res) => {
        setComptes(res.comptes || [])
        if (res.comptes && res.comptes.length > 0 && !compteId) {
          setCompteId(res.comptes[0].id)
        }
      })
      if (soldeActuel > 0) {
        setMontant(String(soldeActuel))
      }
    }
  }, [isOpen, soldeActuel, compteId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const numMontant = Number(montant)
    if (!numMontant || numMontant <= 0) {
      setError("Veuillez saisir un montant valide supérieur à 0.")
      return
    }
    if (!compteId) {
      setError("Veuillez sélectionner le compte de trésorerie de décaissement.")
      return
    }

    setLoading(true)
    setError('')

    const res = await addPaiementFournisseur({
      fournisseur_nom: fournisseurNom,
      montant: numMontant,
      compte_id: compteId,
      date_paiement: datePaiement,
      mode_paiement: modePaiement,
      reference_piece: referencePiece || null,
      motif: motif || null,
    })

    setLoading(false)

    if (res?.error) {
      setError(res.error)
    } else {
      setIsOpen(false)
      setReferencePiece('')
      setMotif('')
      onSuccess()
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={!fournisseurNom}
        className="inline-flex items-center gap-1.5 rounded-md bg-success px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-success/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-success transition-colors disabled:opacity-50"
      >
        <Wallet className="h-4 w-4" />
        <span>Enregistrer un règlement</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-xl bg-surface border border-surface-border p-6 shadow-xl animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Règlement Fournisseur
                </h3>
                <p className="text-xs text-foreground-muted">
                  Bénéficiaire : <strong className="text-foreground">{fournisseurNom}</strong>
                </p>
              </div>
              {soldeActuel > 0 && (
                <div className="text-right">
                  <span className="text-[11px] text-foreground-muted block">Dette actuelle</span>
                  <span className="text-sm font-bold text-danger">
                    {soldeActuel.toLocaleString('fr-FR')} {unite}
                  </span>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-3 p-3 bg-danger/10 border border-danger/20 rounded-md text-xs text-danger">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Montant décaissé ({unite}) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={montant}
                    onChange={(e) => setMontant(e.target.value)}
                    placeholder="Ex: 500000"
                    className="w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm font-semibold text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Date du règlement *
                  </label>
                  <input
                    type="date"
                    required
                    value={datePaiement}
                    onChange={(e) => setDatePaiement(e.target.value)}
                    className="w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Compte de trésorerie décaissé *
                  </label>
                  <select
                    required
                    value={compteId}
                    onChange={(e) => setCompteId(e.target.value)}
                    className="w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs"
                  >
                    {comptes.map((cp) => (
                      <option key={cp.id} value={cp.id}>
                        {cp.nom} ({cp.type_compte})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Mode de règlement *
                  </label>
                  <select
                    value={modePaiement}
                    onChange={(e) => setModePaiement(e.target.value as any)}
                    className="w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs"
                  >
                    <option value="espece">Espèces (Caisse)</option>
                    <option value="cheque">Chèque bancaire</option>
                    <option value="virement">Virement bancaire</option>
                    <option value="mobile_money">Mobile Money (Wave / OM)</option>
                    <option value="bon">Bon d&apos;engagement</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Référence de la pièce / N° Chèque / Reçu
                </label>
                <input
                  type="text"
                  value={referencePiece}
                  onChange={(e) => setReferencePiece(e.target.value)}
                  placeholder="Ex: CHQ-2026-45, VIR-0092, BLP-78..."
                  className="w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Motif / Commentaire (Optionnel)
                </label>
                <input
                  type="text"
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  placeholder="Ex: Règlement facture engrais urée..."
                  className="w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={loading}
                  className="rounded-md border border-surface-border bg-surface px-3 py-2 text-xs font-semibold text-foreground hover:bg-background transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-md bg-success px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-success/90 transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{loading ? "Enregistrement..." : "Valider le décaissement"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

