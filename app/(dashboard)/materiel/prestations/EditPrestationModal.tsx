'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { updatePrestation } from '../actions'

export default function EditPrestationModal({ prestation, materiels }: { prestation: any, materiels: any[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    
    const materiel_id = formData.get('materiel_id') as string
    const type_prestation = formData.get('type_prestation') as string
    const client_nom = formData.get('client_nom') as string
    const superficie = Number(formData.get('superficie') || 0)
    const montant_facture = Number(formData.get('montant_facture') || 0)
    const date_prestation = formData.get('date_prestation') as string

    const res = await updatePrestation(
      prestation.id,
      materiel_id, 
      type_prestation, 
      client_nom, 
      superficie, 
      montant_facture, 
      date_prestation
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
        title="Modifier la prestation"
        className="text-secondary hover:text-secondary/80 p-1 rounded-md"
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={() => setIsOpen(false)} />
            
            <div className="relative transform overflow-hidden rounded-lg bg-surface text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-surface-border">
              <div className="bg-surface px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-semibold leading-6 text-foreground mb-4">
                  Modifier la Prestation
                </h3>
                <form id={`edit-prestation-form-${prestation.id}`} onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="materiel_id" className="block text-sm font-medium text-foreground">Équipement utilisé</label>
                    <select
                      name="materiel_id"
                      id="materiel_id"
                      defaultValue={prestation.materiel_id}
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
                    <label htmlFor="type_prestation" className="block text-sm font-medium text-foreground">Type de prestation</label>
                    <input
                      type="text"
                      name="type_prestation"
                      id="type_prestation"
                      defaultValue={prestation.type_prestation}
                      required
                      className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="client_nom" className="block text-sm font-medium text-foreground">Client / Membre</label>
                    <input
                      type="text"
                      name="client_nom"
                      id="client_nom"
                      defaultValue={prestation.client_nom || ''}
                      className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="superficie" className="block text-sm font-medium text-foreground">Superficie (ha)</label>
                      <input
                        type="number"
                        name="superficie"
                        id="superficie"
                        defaultValue={prestation.superficie || 0}
                        min="0"
                        step="0.01"
                        className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="montant_facture" className="block text-sm font-medium text-foreground">Montant total (FCFA)</label>
                      <input
                        type="number"
                        name="montant_facture"
                        id="montant_facture"
                        defaultValue={prestation.montant_facture || 0}
                        min="0"
                        required
                        className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="date_prestation" className="block text-sm font-medium text-foreground">Date de réalisation</label>
                    <input
                      type="date"
                      name="date_prestation"
                      id="date_prestation"
                      defaultValue={prestation.date_prestation || ''}
                      required
                      className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                    />
                  </div>
                </form>
              </div>
              <div className="bg-background/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="submit"
                  form={`edit-prestation-form-${prestation.id}`}
                  disabled={loading}
                  className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 sm:ml-3 sm:w-auto disabled:opacity-50"
                >
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
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
