'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { addIntrant } from './actions'

export default function CreateIntrantButton({ dict }: { dict: any }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const d = dict.intrants_extra
  const types: string[] = d.type_options

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const res = await addIntrant(formData)
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
        {d.create_btn}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={() => setIsOpen(false)} />

            <div className="relative transform overflow-hidden rounded-lg bg-surface text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-surface-border">
              <div className="bg-surface px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-semibold leading-6 text-foreground mb-4">
                  {d.modal.create_title}
                </h3>
                <form action={handleSubmit} id="add-intrant-form" className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground">{d.modal.product_name}</label>
                    <input type="text" name="nom" required placeholder={d.modal.product_name_placeholder} className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{d.modal.type}</label>
                    <input type="text" list="type_intrants_list" name="type_intrant" required placeholder={d.modal.type_placeholder} className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                    <datalist id="type_intrants_list">
                      {types.map((t) => <option key={t} value={t} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{d.modal.initial_stock}</label>
                    <input type="number" step="0.01" name="quantite_stock" required className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{d.modal.description_optional}</label>
                    <input type="text" name="description" placeholder={d.modal.description_placeholder} className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                  </div>
                </form>
              </div>
              <div className="bg-background/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="submit"
                  form="add-intrant-form"
                  disabled={loading}
                  className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover sm:ml-3 sm:w-auto disabled:opacity-50"
                >
                  {loading ? dict.common.creating : d.modal.create_submit}
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
