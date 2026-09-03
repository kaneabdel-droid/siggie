'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { addCampagne } from './actions'

export default function CreateCampagneButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const res = await addCampagne(formData)
    setLoading(false)
    if (res?.error) {
      alert(res.error)
    } else {
      setIsOpen(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="block rounded-md bg-primary px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Nouvelle Campagne
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={() => setIsOpen(false)} />
            
            <div className="relative transform overflow-hidden rounded-lg bg-surface text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-surface-border">
              <div className="bg-surface px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-semibold leading-6 text-foreground mb-4">
                  Créer une nouvelle campagne
                </h3>
                <form action={handleSubmit} id="add-campagne-form" className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground">Nom de la campagne</label>
                    <input type="text" name="nom" required placeholder="Ex: Hivernage 2024" className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground">Date de début</label>
                      <input type="date" name="date_debut" className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground">Date de fin</label>
                      <input type="date" name="date_fin" className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">Mode de remboursement</label>
                    <select name="mode_remboursement" className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2">
                      <option value="espece">Espèces uniquement</option>
                      <option value="nature">Nature (Produits) uniquement</option>
                      <option value="mixte">Mixte (Espèces + Nature)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">Produit collecté</label>
                    <input type="text" name="produit_collecte" placeholder="Ex: Arachide, Mil..." className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground">Prix collecté (FCFA/Kg)</label>
                      <input type="number" step="0.01" name="prix_collecte" className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground">Poids standard (Kg)</label>
                      <input type="number" step="0.01" name="poids_standard" className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">Statut</label>
                    <select name="statut" className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2">
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
                  form="add-campagne-form"
                  disabled={loading}
                  className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover sm:ml-3 sm:w-auto disabled:opacity-50"
                >
                  {loading ? 'Création...' : 'Créer la campagne'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
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
