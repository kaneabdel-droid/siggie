'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { addPrestation } from '../actions'
import PrestationFields, { type ProduitMateriel } from './PrestationFields'
import type { ContexteBudgetMateriel } from '../BudgetCampagneChamps'

export default function AddPrestationModal({
  materiels,
  produits,
  varietes,
  budget,
  dict,
}: {
  materiels: any[]
  produits: ProduitMateriel[]
  varietes: Record<string, string[]>
  budget: ContexteBudgetMateriel
  dict: any
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const t = dict.materiel_pages.prestations.form

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const res = await addPrestation(new FormData(e.currentTarget))

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
        className="inline-flex items-center gap-x-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
      >
        <Plus className="-ml-0.5 h-5 w-5" aria-hidden="true" />
        {dict.materiel_pages.prestations.add_btn}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={() => setIsOpen(false)} />

            <div className="relative transform overflow-hidden rounded-lg bg-surface text-start shadow-xl transition-all w-full sm:my-8 sm:max-w-2xl border border-surface-border">
              <div className="bg-surface px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-semibold leading-6 text-foreground mb-4">
                  {t.add_title}
                </h3>
                <form id="add-prestation-form" onSubmit={handleSubmit}>
                  <PrestationFields materiels={materiels} produits={produits} varietes={varietes} budget={budget} dict={dict} />
                </form>
              </div>
              <div className="bg-background/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="submit"
                  form="add-prestation-form"
                  disabled={loading}
                  className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 sm:ml-3 sm:w-auto disabled:opacity-50"
                >
                  {loading ? dict.common.adding : dict.common.add}
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
