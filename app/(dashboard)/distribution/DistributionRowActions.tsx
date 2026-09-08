'use client'

import { useState } from 'react'
import { Trash2, Edit } from 'lucide-react'
import { deleteDistribution, updateDistribution } from './actions'

export default function DistributionRowActions({ id, intrantNom, quantite, dict }: { id: string, intrantNom: string, quantite: number, dict: any }) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [newQuantite, setNewQuantite] = useState(quantite.toString())
  const [loading, setLoading] = useState(false)
  const d = dict.distribution_extra

  async function handleDelete() {
    setLoading(true)
    const res = await deleteDistribution(id)
    setLoading(false)
    if (res?.error) {
      alert(res.error)
    } else {
      setIsDeleteOpen(false)
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const parsed = Number(newQuantite)
    if (isNaN(parsed) || parsed <= 0) {
      alert(d.invalid_quantity)
      setLoading(false)
      return
    }

    const res = await updateDistribution(id, parsed)
    setLoading(false)
    if (res?.error) {
      alert(res.error)
    } else {
      setIsEditOpen(false)
    }
  }

  return (
    <>
      <div className="flex justify-end gap-2">
        <button onClick={() => setIsEditOpen(true)} className="text-secondary hover:text-secondary/80 p-1" title={d.edit_tooltip}>
          <Edit className="h-4 w-4" />
        </button>
        <button onClick={() => setIsDeleteOpen(true)} className="text-foreground-muted hover:text-danger p-1" title={d.cancel_tooltip}>
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {isEditOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={() => setIsEditOpen(false)} />

            <div className="relative transform overflow-hidden rounded-lg bg-surface text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-surface-border">
              <div className="bg-surface px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-semibold leading-6 text-foreground mb-4">
                  {d.modal.edit_title}
                </h3>
                <p className="text-sm text-foreground-muted mb-4">
                  {d.modal.product_label} <strong>{intrantNom}</strong><br/>
                  {d.modal.current_quantity_label} <strong>{quantite}</strong>
                </p>
                <form id={`edit-dist-${id}`} onSubmit={handleEdit}>
                  <label className="block text-sm font-medium text-foreground mb-1">{d.modal.new_quantity}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={newQuantite}
                    onChange={(e) => setNewQuantite(e.target.value)}
                    required
                    className="block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2"
                  />
                </form>
              </div>
              <div className="bg-background/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="submit"
                  form={`edit-dist-${id}`}
                  disabled={loading}
                  className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 sm:ml-3 sm:w-auto disabled:opacity-50"
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

      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={() => setIsDeleteOpen(false)} />

            <div className="relative transform overflow-hidden rounded-lg bg-surface text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-surface-border">
              <div className="bg-surface px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-semibold leading-6 text-foreground mb-4">
                  {d.modal.cancel_title}
                </h3>
                <p className="text-sm text-foreground-muted">
                  {d.modal.cancel_confirm_prefix} <strong>{quantite} {intrantNom}</strong> ?
                  <br/><br/>
                  <span className="text-success">{d.modal.cancel_note}</span>
                </p>
              </div>
              <div className="bg-background/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="inline-flex w-full justify-center rounded-md bg-danger px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-danger/80 sm:ml-3 sm:w-auto disabled:opacity-50"
                >
                  {loading ? d.modal.cancelling : d.modal.cancel_submit}
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeleteOpen(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-surface px-3 py-2 text-sm font-semibold text-foreground shadow-sm ring-1 ring-inset ring-surface-border hover:bg-background sm:mt-0 sm:w-auto"
                >
                  {dict.common.close}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
