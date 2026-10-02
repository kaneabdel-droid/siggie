'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { updatePrestation } from '../actions'
import PrestationFields, { type ProduitMateriel } from './PrestationFields'
import type { ContexteBudgetMateriel } from '../BudgetCampagneChamps'

export default function EditPrestationModal({
  prestation,
  materiels,
  produits,
  varietes,
  budget,
  dict,
}: {
  prestation: any
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
    const res = await updatePrestation(prestation.id, new FormData(e.currentTarget))

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
        title={dict.materiel_pages.prestations.edit_title_btn}
        className="text-secondary hover:text-secondary/80 p-1 rounded-md"
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={() => setIsOpen(false)} />

            <div className="relative transform overflow-hidden rounded-lg bg-surface text-start shadow-xl transition-all w-full sm:my-8 sm:max-w-2xl border border-surface-border">
              <div className="bg-surface px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-semibold leading-6 text-foreground mb-4">
                  {t.edit_title}
                </h3>
                <form id={`edit-prestation-form-${prestation.id}`} onSubmit={handleSubmit}>
                  <PrestationFields prestation={prestation} materiels={materiels} produits={produits} varietes={varietes} budget={budget} dict={dict} />
                </form>
              </div>
              <div className="bg-background/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="submit"
                  form={`edit-prestation-form-${prestation.id}`}
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
