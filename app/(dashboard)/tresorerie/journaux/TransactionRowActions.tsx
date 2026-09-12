'use client'

import { useState } from 'react'
import { Edit, Trash2 } from 'lucide-react'
import { updateTransaction, deleteTransaction } from '../actions'

type Transaction = {
  id: string
  type_transaction: string
  montant: number
  motif: string
  type_piece: string | null
  imputation_id: string | null
}

export default function TransactionRowActions({
  transaction,
  imputations,
  onSuccess,
  dict,
}: {
  transaction: Transaction
  imputations: any[]
  onSuccess: () => void
  dict: any
}) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const t = dict.tresorerie_pages.journaux

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)

    const res = await updateTransaction(transaction.id, {
      type_transaction: formData.get('type_transaction') as string,
      montant: Number(formData.get('montant')),
      motif: formData.get('motif') as string,
      type_piece: (formData.get('type_piece') as string) || undefined,
      imputation_id: (formData.get('imputation_id') as string) || undefined,
    })
    setLoading(false)
    if (res?.error) {
      alert(res.error)
    } else {
      setIsEditOpen(false)
      onSuccess()
    }
  }

  async function handleDelete() {
    setLoading(true)
    const res = await deleteTransaction(transaction.id)
    setLoading(false)
    if (res?.error) {
      alert(res.error)
    } else {
      setIsDeleteOpen(false)
      onSuccess()
    }
  }

  return (
    <>
      <div className="flex justify-end gap-2">
        <button onClick={() => setIsEditOpen(true)} className="text-secondary hover:text-secondary/80 p-1" title={t.edit_tooltip}>
          <Edit className="h-4 w-4" />
        </button>
        <button onClick={() => setIsDeleteOpen(true)} className="text-danger hover:text-danger/80 p-1" title={t.delete_tooltip}>
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Edit Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={() => setIsEditOpen(false)} />

            <div className="relative transform overflow-hidden rounded-lg bg-surface text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-surface-border">
              <div className="bg-surface px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-semibold leading-6 text-foreground mb-4">
                  {t.edit_title}
                </h3>
                <form id={`edit-tx-form-${transaction.id}`} onSubmit={handleEdit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground">{t.form.type_label}</label>
                    <select name="type_transaction" defaultValue={transaction.type_transaction} required className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2">
                      <option value="entree">{t.form.type_in}</option>
                      <option value="sortie">{t.form.type_out}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{t.form.piece_label}</label>
                    <select name="type_piece" defaultValue={transaction.type_piece || ''} className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2">
                      <option value="">{t.form.piece_none}</option>
                      <option value="facture_fournisseur">{t.form.piece_supplier}</option>
                      <option value="retrait_espece">{t.form.piece_withdrawal}</option>
                      <option value="versement">{t.form.piece_deposit}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{t.form.amount_label}</label>
                    <input type="number" name="montant" defaultValue={transaction.montant} required min={1} className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{t.form.imputation_label}</label>
                    <select name="imputation_id" defaultValue={transaction.imputation_id || ''} className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2">
                      <option value="">{t.form.imputation_none}</option>
                      {imputations.map((imp) => (
                        <option key={imp.id} value={imp.id}>{imp.libelle}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{t.form.reason_label}</label>
                    <input type="text" name="motif" defaultValue={transaction.motif} required placeholder={t.form.reason_placeholder} className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                  </div>
                </form>
              </div>
              <div className="bg-background/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="submit"
                  form={`edit-tx-form-${transaction.id}`}
                  disabled={loading}
                  className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover sm:ml-3 sm:w-auto disabled:opacity-50"
                >
                  {loading ? dict.common.saving : dict.common.save}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
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
                  {t.delete_title}
                </h3>
                <p className="text-sm text-foreground-muted">
                  {t.delete_confirm_prefix} <strong>{transaction.motif}</strong>{t.delete_confirm_suffix}
                  <br /><br />
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
