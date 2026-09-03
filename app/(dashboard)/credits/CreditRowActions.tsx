'use client'

import { useState } from 'react'
import { Check, X, Trash2, Banknote } from 'lucide-react'
import { updateCreditStatus, deleteCredit, addDecaissementCredit } from './actions'

type Credit = {
  id: string
  montant_demande: number
  montant_accorde: number
  statut: string
  banque_nom: string | null
}

export default function CreditRowActions({ credit, comptes }: { credit: Credit, comptes?: any[] }) {
  const [isApproveOpen, setIsApproveOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDecaissementOpen, setIsDecaissementOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleApprove(formData: FormData) {
    setLoading(true)
    const montant = parseFloat(formData.get('montant_accorde') as string)
    const res = await updateCreditStatus(credit.id, 'valide', montant)
    setLoading(false)
    if (res?.error) {
      alert(res.error)
    } else {
      setIsApproveOpen(false)
    }
  }

  async function handleReject() {
    if (!confirm("Êtes-vous sûr de vouloir rejeter cette demande de crédit ?")) return
    setLoading(true)
    const res = await updateCreditStatus(credit.id, 'rejete')
    setLoading(false)
    if (res?.error) alert(res.error)
  }

  async function handleDelete() {
    setLoading(true)
    const res = await deleteCredit(credit.id)
    setLoading(false)
    if (res?.error) {
      alert(res.error)
    } else {
      setIsDeleteOpen(false)
    }
  }

  async function handleDecaissement(formData: FormData) {
    setLoading(true)
    formData.append('credit_id', credit.id)
    const res = await addDecaissementCredit(formData)
    setLoading(false)
    if (res?.error) alert(res.error)
    else setIsDecaissementOpen(false)
  }

  return (
    <>
      <div className="flex justify-end gap-2">
        {credit.statut === 'en_attente' && (
          <>
            <button onClick={() => setIsApproveOpen(true)} className="text-success hover:text-success/80 p-1" title="Accorder le crédit">
              <Check className="h-5 w-5" />
            </button>
            <button onClick={handleReject} className="text-danger hover:text-danger/80 p-1" title="Rejeter la demande">
              <X className="h-5 w-5" />
            </button>
          </>
        )}
        {credit.statut === 'valide' && (
          <button onClick={() => setIsDecaissementOpen(true)} className="text-primary hover:text-primary/80 p-1" title="Enregistrer un décaissement">
            <Banknote className="h-5 w-5" />
          </button>
        )}
        <button onClick={() => setIsDeleteOpen(true)} className="text-foreground-muted hover:text-danger p-1" title="Supprimer l'enregistrement">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Decaissement Modal */}
      {isDecaissementOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={() => setIsDecaissementOpen(false)} />
            
            <div className="relative transform overflow-hidden rounded-lg bg-surface text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-surface-border">
              <div className="bg-surface px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-semibold leading-6 text-foreground mb-4">
                  Nouveau décaissement sur le crédit
                </h3>
                <form action={handleDecaissement} id={`decaissement-form-${credit.id}`} className="space-y-4">
                  <p className="text-sm text-foreground-muted mb-4">
                    Crédit Accordé : <strong className="text-foreground">{credit.montant_accorde?.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA</strong>
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-foreground">Type d'opération</label>
                    <select name="type_piece" required className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2">
                      <option value="facture_fournisseur">Paiement Fournisseur (Virement)</option>
                      <option value="retrait_espece">Retrait d'espèces</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">Compte source (Banque)</label>
                    <select name="compte_id" required className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2">
                      <option value="">Sélectionnez un compte...</option>
                      {comptes?.filter(c => c.type_compte === 'banque').map(c => (
                        <option key={c.id} value={c.id}>{c.nom}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">Montant (FCFA)</label>
                    <input type="number" step="0.01" name="montant" required max={credit.montant_accorde} className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">Motif / Référence</label>
                    <input type="text" name="motif" required placeholder="Ex: Paiement facture engrais N°123" className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                  </div>
                </form>
              </div>
              <div className="bg-background/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="submit"
                  form={`decaissement-form-${credit.id}`}
                  disabled={loading}
                  className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover sm:ml-3 sm:w-auto disabled:opacity-50"
                >
                  {loading ? 'Enregistrement...' : 'Enregistrer le décaissement'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsDecaissementOpen(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-surface px-3 py-2 text-sm font-semibold text-foreground shadow-sm ring-1 ring-inset ring-surface-border hover:bg-background sm:mt-0 sm:w-auto"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {isApproveOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={() => setIsApproveOpen(false)} />
            
            <div className="relative transform overflow-hidden rounded-lg bg-surface text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-surface-border">
              <div className="bg-surface px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-semibold leading-6 text-foreground mb-4">
                  Validation du crédit ({credit.banque_nom || 'Banque non spécifiée'})
                </h3>
                <form action={handleApprove} id={`approve-form-${credit.id}`} className="space-y-4">
                  <p className="text-sm text-foreground-muted mb-4">
                    Montant initialement demandé : <strong className="text-foreground">{credit.montant_demande.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA</strong>
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-foreground">Montant réellement accordé (FCFA)</label>
                    <input type="number" step="0.01" name="montant_accorde" defaultValue={credit.montant_demande} required className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                    <p className="text-xs text-foreground-muted mt-1">Le montant accordé par la banque peut être différent de la demande initiale.</p>
                  </div>
                </form>
              </div>
              <div className="bg-background/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="submit"
                  form={`approve-form-${credit.id}`}
                  disabled={loading}
                  className="inline-flex w-full justify-center rounded-md bg-success px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-success/80 sm:ml-3 sm:w-auto disabled:opacity-50"
                >
                  {loading ? 'Validation...' : 'Confirmer le montant'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsApproveOpen(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-surface px-3 py-2 text-sm font-semibold text-foreground shadow-sm ring-1 ring-inset ring-surface-border hover:bg-background sm:mt-0 sm:w-auto"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={() => setIsDeleteOpen(false)} />
            
            <div className="relative transform overflow-hidden rounded-lg bg-surface text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-surface-border">
              <div className="bg-surface px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-semibold leading-6 text-foreground mb-4">
                  Supprimer l'enregistrement
                </h3>
                <p className="text-sm text-foreground-muted">
                  Êtes-vous sûr de vouloir supprimer cette ligne ?
                  <br/><br/>
                  <span className="text-danger">⚠️ Attention : Cette action est irréversible.</span>
                </p>
              </div>
              <div className="bg-background/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="inline-flex w-full justify-center rounded-md bg-danger px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-danger/80 sm:ml-3 sm:w-auto disabled:opacity-50"
                >
                  {loading ? 'Suppression...' : 'Supprimer'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeleteOpen(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-surface px-3 py-2 text-sm font-semibold text-foreground shadow-sm ring-1 ring-inset ring-surface-border hover:bg-background sm:mt-0 sm:w-auto"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
