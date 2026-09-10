'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { addSortieStockNature } from './actions'

export default function AddSortieModal({
  campagneId,
  membres,
  onSuccess,
  dict,
}: {
  campagneId: string
  membres: any[]
  onSuccess: () => void
  dict: any
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [typeSortie, setTypeSortie] = useState('vente')
  const [tiersType, setTiersType] = useState('membre')
  const t = dict.remboursements_pages.stock_nature.form

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)

    const res = await addSortieStockNature({
      campagne_id: campagneId,
      type_sortie: formData.get('type_sortie') as string,
      tiers_type: formData.get('tiers_type') as string,
      membre_id: (formData.get('membre_id') as string) || undefined,
      tiers_nom: (formData.get('tiers_nom') as string) || undefined,
      quantite: Number(formData.get('quantite')),
      prix_unitaire: Number(formData.get('prix_unitaire')),
      motif: (formData.get('motif') as string) || undefined,
      date_sortie: formData.get('date_sortie') as string,
    })

    setLoading(false)
    if (res?.error) {
      alert(res.error)
    } else {
      setIsOpen(false)
      onSuccess()
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        disabled={!campagneId}
        className="inline-flex items-center gap-x-2 rounded-md bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground shadow-sm hover:bg-secondary/90 disabled:opacity-50"
      >
        <Plus className="-ml-0.5 h-5 w-5" aria-hidden="true" />
        {dict.remboursements_pages.stock_nature.add_sortie}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={() => setIsOpen(false)} />

            <div className="relative transform overflow-hidden rounded-lg bg-surface text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-surface-border">
              <div className="bg-surface px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-semibold leading-6 text-foreground mb-4">
                  {t.title}
                </h3>
                <form id="add-sortie-form" onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="type_sortie" className="block text-sm font-medium text-foreground">{t.type_label}</label>
                    <select
                      name="type_sortie"
                      id="type_sortie"
                      value={typeSortie}
                      onChange={(e) => setTypeSortie(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                    >
                      <option value="vente">{dict.remboursements_pages.stock_nature.type_vente}</option>
                      <option value="ristourne">{dict.remboursements_pages.stock_nature.type_ristourne}</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="tiers_type" className="block text-sm font-medium text-foreground">{t.tiers_type_label}</label>
                    <select
                      name="tiers_type"
                      id="tiers_type"
                      value={tiersType}
                      onChange={(e) => setTiersType(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                    >
                      <option value="membre">{t.tiers_type_membre}</option>
                      <option value="client">{t.tiers_type_client}</option>
                    </select>
                  </div>

                  {tiersType === 'membre' ? (
                    <div>
                      <label htmlFor="membre_id" className="block text-sm font-medium text-foreground">{t.membre_label}</label>
                      <select
                        name="membre_id"
                        id="membre_id"
                        required
                        className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                      >
                        <option value="">{t.select_membre}</option>
                        {membres.map((m) => (
                          <option key={m.id} value={m.id}>{m.prenom} {m.nom}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label htmlFor="tiers_nom" className="block text-sm font-medium text-foreground">{t.client_label}</label>
                      <input
                        type="text"
                        name="tiers_nom"
                        id="tiers_nom"
                        required
                        placeholder={t.client_placeholder}
                        className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="quantite" className="block text-sm font-medium text-foreground">{t.quantity_label}</label>
                      <input
                        type="number"
                        step="0.01"
                        name="quantite"
                        id="quantite"
                        required
                        min={0.01}
                        className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="prix_unitaire" className="block text-sm font-medium text-foreground">
                        {typeSortie === 'vente' ? t.price_label_vente : t.price_label_ristourne}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="prix_unitaire"
                        id="prix_unitaire"
                        required
                        min={0}
                        className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="date_sortie" className="block text-sm font-medium text-foreground">{t.date_label}</label>
                    <input
                      type="date"
                      name="date_sortie"
                      id="date_sortie"
                      defaultValue={new Date().toISOString().slice(0, 10)}
                      required
                      className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="motif" className="block text-sm font-medium text-foreground">{t.motif_label}</label>
                    <input
                      type="text"
                      name="motif"
                      id="motif"
                      placeholder={t.motif_placeholder}
                      className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                    />
                  </div>
                </form>
              </div>
              <div className="bg-background/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="submit"
                  form="add-sortie-form"
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
