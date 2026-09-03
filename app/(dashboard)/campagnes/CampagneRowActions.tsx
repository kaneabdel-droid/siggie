'use client'

import { useState } from 'react'
import { Edit, Trash2, Settings } from 'lucide-react'
import { updateCampagne, deleteCampagne } from './actions'
import Link from 'next/link'

type Campagne = {
  id: string
  nom: string
  date_debut: string | null
  date_fin: string | null
  mode_remboursement: string
  produit_collecte: string | null
  prix_collecte: number | null
  poids_standard: number | null
  statut: string
}

export default function CampagneRowActions({ campagne }: { campagne: Campagne }) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleEdit(formData: FormData) {
    setLoading(true)
    const res = await updateCampagne(campagne.id, formData)
    setLoading(false)
    if (res?.error) {
      alert(res.error)
    } else {
      setIsEditOpen(false)
    }
  }

  async function handleDelete() {
    setLoading(true)
    const res = await deleteCampagne(campagne.id)
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
        <Link href={`/campagnes/${campagne.id}/config`} className="text-primary hover:text-primary/80 p-1" title="Configuration de la campagne">
          <Settings className="h-4 w-4" />
        </Link>
        <button onClick={() => setIsEditOpen(true)} className="text-secondary hover:text-secondary/80 p-1" title="Modifier">
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
                  Modifier la campagne
                </h3>
                <form action={handleEdit} id={`edit-form-${campagne.id}`} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground">Nom de la campagne</label>
                    <input type="text" name="nom" defaultValue={campagne.nom} required className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground">Date de début</label>
                      <input type="date" name="date_debut" defaultValue={campagne.date_debut || ''} className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground">Date de fin</label>
                      <input type="date" name="date_fin" defaultValue={campagne.date_fin || ''} className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">Mode de remboursement</label>
                    <select name="mode_remboursement" defaultValue={campagne.mode_remboursement} className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2">
                      <option value="espece">Espèces uniquement</option>
                      <option value="nature">Nature (Produits) uniquement</option>
                      <option value="mixte">Mixte (Espèces + Nature)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">Produit collecté</label>
                    <input type="text" name="produit_collecte" defaultValue={campagne.produit_collecte || ''} className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground">Prix collecté (FCFA/Kg)</label>
                      <input type="number" step="0.01" name="prix_collecte" defaultValue={campagne.prix_collecte || ''} className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground">Poids standard (Kg)</label>
                      <input type="number" step="0.01" name="poids_standard" defaultValue={campagne.poids_standard || ''} className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">Statut</label>
                    <select name="statut" defaultValue={campagne.statut} className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2">
                      <option value="en_cours">En cours</option>
                      <option value="terminee">Terminée</option>
                      <option value="annulee">Annulée</option>
                    </select>
                  </div>
                </form>
              </div>
              <div className="bg-background/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="submit"
                  form={`edit-form-${campagne.id}`}
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
                  Supprimer la campagne
                </h3>
                <p className="text-sm text-foreground-muted">
                  Êtes-vous sûr de vouloir supprimer la campagne <strong>{campagne.nom}</strong> ?
                  <br/><br/>
                  <span className="text-danger">⚠️ Attention : Cela supprimera également tous les intrants et crédits liés à cette campagne !</span>
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
