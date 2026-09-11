'use client'

import { useState } from 'react'
import { Check, X, Trash2, Banknote, Undo2 } from 'lucide-react'
import { updateCreditStatus, deleteCredit, addDecaissementCredit, addRemboursementCredit } from './actions'

type Credit = {
  id: string
  montant_demande: number
  montant_accorde: number
  statut: string
  banque_nom: string | null
  taux_interet?: number | null
  duree_credit?: number | null
}

export default function CreditRowActions({ credit, comptes, dict, locale }: { credit: Credit, comptes?: any[], dict: any, locale?: string }) {
  const [isApproveOpen, setIsApproveOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDecaissementOpen, setIsDecaissementOpen] = useState(false)
  const [isRemboursementOpen, setIsRemboursementOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const d = dict.credits_extra
  const localeCode = locale === 'fr' ? 'fr-FR' : locale === 'en' ? 'en-US' : 'fr-FR'

  async function handleApprove(formData: FormData) {
    setLoading(true)
    const montant = parseFloat(formData.get('montant_accorde') as string)
    const taux = parseFloat(formData.get('taux_interet') as string) || 0
    const duree = parseInt(formData.get('duree_credit') as string, 10) || 0
    const res = await updateCreditStatus(credit.id, 'valide', montant, taux, duree)
    setLoading(false)
    if (res?.error) {
      alert(res.error)
    } else {
      setIsApproveOpen(false)
    }
  }

  async function handleReject() {
    if (!confirm(d.reject_confirm)) return
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

  async function handleRemboursement(formData: FormData) {
    setLoading(true)
    formData.append('credit_id', credit.id)
    const res = await addRemboursementCredit(formData)
    setLoading(false)
    if (res?.error) alert(res.error)
    else setIsRemboursementOpen(false)
  }

  return (
    <>
      <div className="flex justify-end gap-2">
        {credit.statut === 'en_attente' && (
          <>
            <button onClick={() => setIsApproveOpen(true)} className="text-success hover:text-success/80 p-1" title={d.approve_tooltip}>
              <Check className="h-5 w-5" />
            </button>
            <button onClick={handleReject} className="text-danger hover:text-danger/80 p-1" title={d.reject_tooltip}>
              <X className="h-5 w-5" />
            </button>
          </>
        )}
        {credit.statut === 'valide' && (
          <>
            <button onClick={() => setIsDecaissementOpen(true)} className="text-primary hover:text-primary/80 p-1" title={d.decaissement_tooltip}>
              <Banknote className="h-5 w-5" />
            </button>
            <button onClick={() => setIsRemboursementOpen(true)} className="text-warning hover:text-warning/80 p-1" title={d.remboursement_tooltip}>
              <Undo2 className="h-5 w-5" />
            </button>
          </>
        )}
        <button onClick={() => setIsDeleteOpen(true)} className="text-foreground-muted hover:text-danger p-1" title={d.delete_tooltip}>
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
                  {d.modal.decaissement_title}
                </h3>
                <form action={handleDecaissement} id={`decaissement-form-${credit.id}`} className="space-y-4">
                  <p className="text-sm text-foreground-muted mb-4">
                    {d.modal.credit_granted_label} <strong className="text-foreground">{credit.montant_accorde?.toLocaleString(localeCode, { maximumFractionDigits: 0 })} FCFA</strong>
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{d.modal.operation_type}</label>
                    <select name="type_piece" required className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2">
                      <option value="facture_fournisseur">{d.modal.op_supplier}</option>
                      <option value="retrait_espece">{d.modal.op_withdrawal}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{d.modal.source_account}</label>
                    <select name="compte_id" required className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2">
                      <option value="">{d.modal.select_account}</option>
                      {comptes?.filter(c => c.type_compte === 'banque').map(c => (
                        <option key={c.id} value={c.id}>{c.nom}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{d.modal.amount}</label>
                    <input type="number" step="0.01" name="montant" required max={credit.montant_accorde} className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{d.modal.reason_ref}</label>
                    <input type="text" name="motif" required placeholder={d.modal.reason_ref_placeholder} className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
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
                  {loading ? dict.common.saving : d.modal.decaissement_submit}
                </button>
                <button
                  type="button"
                  onClick={() => setIsDecaissementOpen(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-surface px-3 py-2 text-sm font-semibold text-foreground shadow-sm ring-1 ring-inset ring-surface-border hover:bg-background sm:mt-0 sm:w-auto"
                >
                  {dict.common.cancel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Remboursement Modal */}
      {isRemboursementOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={() => setIsRemboursementOpen(false)} />

            <div className="relative transform overflow-hidden rounded-lg bg-surface text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-surface-border">
              <div className="bg-surface px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-semibold leading-6 text-foreground mb-4">
                  {d.modal.remboursement_title}
                </h3>
                <form action={handleRemboursement} id={`remboursement-form-${credit.id}`} className="space-y-4">
                  <p className="text-sm text-foreground-muted mb-4">
                    {d.modal.credit_granted_label} <strong className="text-foreground">{credit.montant_accorde?.toLocaleString(localeCode, { maximumFractionDigits: 0 })} FCFA</strong>
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{d.modal.remboursement_account}</label>
                    <select name="compte_id" required className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2">
                      <option value="">{d.modal.select_account}</option>
                      {comptes?.filter(c => c.type_compte === 'banque').map(c => (
                        <option key={c.id} value={c.id}>{c.nom}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{d.modal.amount}</label>
                    <input type="number" step="0.01" name="montant" required max={credit.montant_accorde} className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{d.modal.reason_ref}</label>
                    <input type="text" name="motif" required placeholder={d.modal.remboursement_reason_placeholder} className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                  </div>
                </form>
              </div>
              <div className="bg-background/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="submit"
                  form={`remboursement-form-${credit.id}`}
                  disabled={loading}
                  className="inline-flex w-full justify-center rounded-md bg-warning px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-warning/80 sm:ml-3 sm:w-auto disabled:opacity-50"
                >
                  {loading ? dict.common.saving : d.modal.remboursement_submit}
                </button>
                <button
                  type="button"
                  onClick={() => setIsRemboursementOpen(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-surface px-3 py-2 text-sm font-semibold text-foreground shadow-sm ring-1 ring-inset ring-surface-border hover:bg-background sm:mt-0 sm:w-auto"
                >
                  {dict.common.cancel}
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
                  {d.modal.approve_title_prefix} ({credit.banque_nom || d.modal.bank_unspecified})
                </h3>
                <form action={handleApprove} id={`approve-form-${credit.id}`} className="space-y-4">
                  <p className="text-sm text-foreground-muted mb-4">
                    {d.modal.amount_requested_label} <strong className="text-foreground">{credit.montant_demande.toLocaleString(localeCode, { maximumFractionDigits: 0 })} FCFA</strong>
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{d.modal.amount_granted}</label>
                    <input type="number" step="0.01" name="montant_accorde" defaultValue={credit.montant_demande} required className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                    <p className="text-xs text-foreground-muted mt-1">{d.modal.amount_granted_note}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground">{d.modal.interest_rate}</label>
                      <input type="number" step="0.01" min="0" name="taux_interet" defaultValue={credit.taux_interet || 0} className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground">{d.modal.credit_duration}</label>
                      <input type="number" step="1" min="0" name="duree_credit" defaultValue={credit.duree_credit || 0} className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                    </div>
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
                  {loading ? dict.common.saving : d.modal.approve_submit}
                </button>
                <button
                  type="button"
                  onClick={() => setIsApproveOpen(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-surface px-3 py-2 text-sm font-semibold text-foreground shadow-sm ring-1 ring-inset ring-surface-border hover:bg-background sm:mt-0 sm:w-auto"
                >
                  {dict.common.cancel}
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
                  {d.modal.delete_title}
                </h3>
                <p className="text-sm text-foreground-muted">
                  {d.modal.delete_confirm}
                  <br/><br/>
                  <span className="text-danger">{dict.common.irreversible_warning}</span>
                </p>
              </div>
              <div className="bg-background/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="inline-flex w-full justify-center rounded-md bg-danger px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-danger/80 sm:ml-3 sm:w-auto disabled:opacity-50"
                >
                  {loading ? dict.common.deleting : dict.common.delete}
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeleteOpen(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-surface px-3 py-2 text-sm font-semibold text-foreground shadow-sm ring-1 ring-inset ring-surface-border hover:bg-background sm:mt-0 sm:w-auto"
                >
                  {dict.common.cancel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
