'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { updateMateriel } from './actions'

export default function EditMaterielModal({ materiel, asMenuItem, dict }: { materiel: any, asMenuItem?: boolean, dict: any }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const d = dict.materiel_extra

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)

    const nom = formData.get('nom') as string
    const etat = formData.get('etat') as string
    const date_acquisition = formData.get('date_acquisition') as string
    const valeur_acquisition = Number(formData.get('valeur_acquisition') || 0)
    const duree_vie_economique = Number(formData.get('duree_vie_economique') || 0)
    const fournisseur = formData.get('fournisseur') as string

    const res = await updateMateriel(
      materiel.id,
      nom,
      etat,
      date_acquisition,
      valeur_acquisition,
      duree_vie_economique,
      fournisseur
    )

    setLoading(false)
    if (res?.error) {
      alert(res.error)
    } else {
      setIsOpen(false)
    }
  }

  return (
    <>
      {asMenuItem ? (
        <button
          onClick={() => setIsOpen(true)}
          title={d.edit_tooltip}
          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-surface-hover text-left"
        >
          <Pencil className="h-4 w-4 text-foreground-muted" aria-hidden="true" />
          <span>{dict.common.edit}</span>
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          title={d.edit_tooltip}
          className="flex items-center gap-1 bg-primary text-white hover:bg-primary/90 px-3 py-1.5 rounded-md font-medium text-sm shadow-sm"
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
          <span>{dict.common.edit}</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={() => setIsOpen(false)} />

            <div className="relative transform overflow-hidden rounded-lg bg-surface text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-surface-border">
              <div className="bg-surface px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-semibold leading-6 text-foreground mb-4">
                  {d.modal.edit_title}
                </h3>
                <form id={`edit-materiel-form-${materiel.id}`} onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="nom" className="block text-sm font-medium text-foreground">{d.modal.name}</label>
                    <input
                      type="text"
                      name="nom"
                      id="nom"
                      defaultValue={materiel.nom}
                      required
                      className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="fournisseur" className="block text-sm font-medium text-foreground">{d.modal.supplier}</label>
                    <input
                      type="text"
                      name="fournisseur"
                      id="fournisseur"
                      defaultValue={materiel.fournisseur || ''}
                      placeholder={d.modal.supplier_placeholder}
                      className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="valeur_acquisition" className="block text-sm font-medium text-foreground">{d.modal.value}</label>
                      <input
                        type="number"
                        name="valeur_acquisition"
                        id="valeur_acquisition"
                        defaultValue={materiel.valeur_acquisition || 0}
                        min="0"
                        className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="duree_vie_economique" className="block text-sm font-medium text-foreground">{d.modal.lifespan}</label>
                      <input
                        type="number"
                        name="duree_vie_economique"
                        id="duree_vie_economique"
                        defaultValue={materiel.duree_vie_economique || 0}
                        min="0"
                        className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="date_acquisition" className="block text-sm font-medium text-foreground">{d.modal.acq_date}</label>
                      <input
                        type="date"
                        name="date_acquisition"
                        id="date_acquisition"
                        defaultValue={materiel.date_acquisition || ''}
                        required
                        className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="etat" className="block text-sm font-medium text-foreground">{d.modal.current_state}</label>
                      <select
                        name="etat"
                        id="etat"
                        defaultValue={materiel.etat}
                        required
                        className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                      >
                        <option value="bon">{d.etat_bon}</option>
                        <option value="reparation">{d.etat_reparation}</option>
                        <option value="en_panne">{d.etat_panne}</option>
                      </select>
                    </div>
                  </div>
                </form>
              </div>
              <div className="bg-background/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="submit"
                  form={`edit-materiel-form-${materiel.id}`}
                  disabled={loading}
                  className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 sm:ml-3 sm:w-auto disabled:opacity-50"
                >
                  {loading ? dict.common.saving : dict.common.save}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
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
