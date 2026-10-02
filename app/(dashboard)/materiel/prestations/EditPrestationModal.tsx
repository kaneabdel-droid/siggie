'use client'

import { useCallback, useState } from 'react'
import { Pencil } from 'lucide-react'
import { updatePrestation } from '../actions'
import Modal from '../Modal'
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
  const fermer = useCallback(() => setIsOpen(false), [])

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
        <Modal
          title={t.edit_title}
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
                form={`edit-prestation-form-${prestation.id}`}
                disabled={loading}
                className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 sm:w-auto disabled:opacity-50"
              >
                {loading ? dict.common.saving : dict.common.save}
              </button>
            </>
          }
        >
          <form id={`edit-prestation-form-${prestation.id}`} onSubmit={handleSubmit}>
            <PrestationFields prestation={prestation} materiels={materiels} produits={produits} varietes={varietes} budget={budget} dict={dict} />
          </form>
        </Modal>
      )}
    </>
  )
}
