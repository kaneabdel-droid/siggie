'use client'

import { useState } from 'react'
import { Edit, Trash2 } from 'lucide-react'
import { updateMembre, deleteMembre } from './actions'

type Membre = {
  id: string
  nom: string
  prenom: string
  village: string | null
  telephone: string | null
  superficie: number | null
  statut: string
}

export default function MembreRowActions({ membre, dict }: { membre: Membre; dict: any }) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const d = dict.membres_extra

  async function handleEdit(formData: FormData) {
    setLoading(true)
    const res = await updateMembre(membre.id, formData)
    setLoading(false)
    if (res?.error) {
      alert(res.error)
    } else {
      setIsEditOpen(false)
    }
  }

  async function handleDelete() {
    setLoading(true)
    const res = await deleteMembre(membre.id)
    setLoading(false)
    if (res?.error) {
      alert(res.error)
    } else {
      setIsDeleteOpen(false)
    }
  }

  return (
    <>
      <div className="flex justify-end gap-2">
        <button onClick={() => setIsEditOpen(true)} className="text-secondary hover:text-secondary/80 p-1">
          <Edit className="h-4 w-4" />
        </button>
        <button onClick={() => setIsDeleteOpen(true)} className="text-danger hover:text-danger/80 p-1">
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
                  {d.modal.edit_title}
                </h3>
                <form action={handleEdit} id={`edit-form-${membre.id}`} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground">{d.modal.last_name}</label>
                    <input type="text" name="nom" defaultValue={membre.nom} required className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{d.modal.first_name}</label>
                    <input type="text" name="prenom" defaultValue={membre.prenom} required className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{d.modal.village}</label>
                    <input type="text" name="village" defaultValue={membre.village || ''} className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{d.modal.phone}</label>
                    <input type="text" name="telephone" defaultValue={membre.telephone || ''} className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{d.modal.superficie}</label>
                    <input type="number" step="0.01" min="0" name="superficie" defaultValue={membre.superficie || 0} className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{d.modal.status}</label>
                    <select name="statut" defaultValue={membre.statut} className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2">
                      <option value="actif">{d.modal.status_active}</option>
                      <option value="inactif">{d.modal.status_inactive}</option>
                    </select>
                  </div>
                </form>
              </div>
              <div className="bg-background/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="submit"
                  form={`edit-form-${membre.id}`}
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
                  {d.modal.delete_title}
                </h3>
                <p className="text-sm text-foreground-muted">
                  {d.modal.delete_confirm_prefix} <strong>{membre.prenom} {membre.nom}</strong> {d.modal.delete_confirm_suffix}
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
