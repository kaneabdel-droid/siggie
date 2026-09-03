'use client'

import { useState } from 'react'
import { Edit, Trash2 } from 'lucide-react'
import { updateIntrant, deleteIntrant } from './actions'

type Intrant = {
  id: string
  type_intrant: string
  nom: string
  quantite_stock: number
  prix_unitaire: number
  description: string | null
  fournisseur: string | null
}

export default function IntrantRowActions({ intrant }: { intrant: Intrant }) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleEdit(formData: FormData) {
    setLoading(true)
    const res = await updateIntrant(intrant.id, formData)
    setLoading(false)
    if (res?.error) {
      alert(res.error)
    } else {
      setIsEditOpen(false)
    }
  }

  async function handleDelete() {
    setLoading(true)
    const res = await deleteIntrant(intrant.id)
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
                  Modifier l'intrant
                </h3>
                <form action={handleEdit} id={`edit-form-${intrant.id}`} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground">Nom du produit</label>
                    <input type="text" name="nom" defaultValue={intrant.nom} required className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">Type d'intrant</label>
                    <input type="text" list="type_intrants_list_edit" name="type_intrant" defaultValue={intrant.type_intrant} required className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                    <datalist id="type_intrants_list_edit">
                      <option value="Engrais" />
                      <option value="Semence" />
                      <option value="Pesticide" />
                      <option value="Fongicide" />
                      <option value="Herbicide" />
                      <option value="Matériel" />
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">Fournisseur (optionnel)</label>
                    <input type="text" name="fournisseur" defaultValue={intrant.fournisseur || ''} placeholder="Nom du fournisseur ou de la société" className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground">Prix unitaire (FCFA)</label>
                      <input type="number" step="0.01" name="prix_unitaire" defaultValue={intrant.prix_unitaire} required className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground">Quantité (Stock)</label>
                      <input type="number" step="0.01" name="quantite_stock" defaultValue={intrant.quantite_stock} required className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">Description / Unité (optionnel)</label>
                    <input type="text" name="description" defaultValue={intrant.description || ''} className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                  </div>
                </form>
              </div>
              <div className="bg-background/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="submit"
                  form={`edit-form-${intrant.id}`}
                  disabled={loading}
                  className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover sm:ml-3 sm:w-auto disabled:opacity-50"
                >
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
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
                  Supprimer l'intrant
                </h3>
                <p className="text-sm text-foreground-muted">
                  Êtes-vous sûr de vouloir supprimer l'intrant <strong>{intrant.nom}</strong> du catalogue ?
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
