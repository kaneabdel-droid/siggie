'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { addConsommation } from '../actions'

export default function AddConsommationModal({ materiels }: { materiels: any[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    
    const materiel_id = formData.get('materiel_id') as string
    const type_consommation = formData.get('type_consommation') as string
    const fournisseur = formData.get('fournisseur') as string
    const quantite = Number(formData.get('quantite') || 0)
    const montant_total = Number(formData.get('montant_total') || 0)
    const date_consommation = formData.get('date_consommation') as string

    const res = await addConsommation(
      materiel_id, 
      type_consommation, 
      fournisseur, 
      quantite, 
      montant_total, 
      date_consommation
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
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-x-2 rounded-md bg-danger px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-danger/90"
      >
        <Plus className="-ml-0.5 h-5 w-5" aria-hidden="true" />
        Saisir une dépense
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={() => setIsOpen(false)} />
            
            <div className="relative transform overflow-hidden rounded-lg bg-surface text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-surface-border">
              <div className="bg-surface px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-semibold leading-6 text-foreground mb-4">
                  Nouvelle Dépense (Consommation / Entretien)
                </h3>
                <form id="add-consommation-form" onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="materiel_id" className="block text-sm font-medium text-foreground">Équipement concerné</label>
                    <select
                      name="materiel_id"
                      id="materiel_id"
                      required
                      className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                    >
                      <option value="">Sélectionner une machine</option>
                      {materiels.map(mat => (
                        <option key={mat.id} value={mat.id}>{mat.nom}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="type_consommation" className="block text-sm font-medium text-foreground">Type de dépense</label>
                    <select
                      name="type_consommation"
                      id="type_consommation"
                      required
                      className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                    >
                      <option value="Carburant">Carburant</option>
                      <option value="Huile">Huile / Lubrifiant</option>
                      <option value="Piece">Pièce de rechange</option>
                      <option value="Reparation">Réparation / Main d'œuvre</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="fournisseur" className="block text-sm font-medium text-foreground">Fournisseur / Station service</label>
                    <input
                      type="text"
                      name="fournisseur"
                      id="fournisseur"
                      className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="quantite" className="block text-sm font-medium text-foreground">Quantité (L, Unité...)</label>
                      <input
                        type="number"
                        name="quantite"
                        id="quantite"
                        min="0"
                        step="0.01"
                        className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="montant_total" className="block text-sm font-medium text-foreground">Montant total (FCFA)</label>
                      <input
                        type="number"
                        name="montant_total"
                        id="montant_total"
                        min="0"
                        required
                        className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="date_consommation" className="block text-sm font-medium text-foreground">Date</label>
                    <input
                      type="date"
                      name="date_consommation"
                      id="date_consommation"
                      required
                      className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                    />
                  </div>
                </form>
              </div>
              <div className="bg-background/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="submit"
                  form="add-consommation-form"
                  disabled={loading}
                  className="inline-flex w-full justify-center rounded-md bg-danger px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-danger/90 sm:ml-3 sm:w-auto disabled:opacity-50"
                >
                  {loading ? 'Ajout...' : 'Ajouter'}
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
