'use client'

import { useCallback, useState } from 'react'
import { Plus } from 'lucide-react'
import { addPrestation } from '../actions'
import Modal from '../Modal'
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
  const fermer = useCallback(() => setIsOpen(false), [])

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
        <Modal
          title={t.add_title}
          onClose={fermer}
          footer={
            <>
              <button
                type="button"
                onClick={fermer}
                className="inline-flex w-full justify-center rounded-md bg-surface px-3 py-2 text-sm font-semibold text-foreground shadow-sm ring-1 ring-inset ring-surface-border hover:bg-background sm:w-auto"
              >
                {dict.common.cancel}
              </button>
              <button
                type="submit"
                form={"add-prestation-form"}
                disabled={loading}
                className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 sm:w-auto disabled:opacity-50"
              >
                {loading ? dict.common.adding : dict.common.add}
              </button>
            </>
          }
        >
          <form id={"add-prestation-form"} onSubmit={handleSubmit}>
            <PrestationFields materiels={materiels} produits={produits} varietes={varietes} budget={budget} dict={dict} />
          </form>
        </Modal>
      )}
    </>
  )
}
