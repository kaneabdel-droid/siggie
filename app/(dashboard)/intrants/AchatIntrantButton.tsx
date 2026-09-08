'use client'

import { useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { buyIntrant } from './actions'

type Intrant = {
  id: string
  nom: string
  type_intrant: string
  quantite_stock: number
}

export default function AchatIntrantButton({ intrants, dict }: { intrants: Intrant[]; dict: any }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const d = dict.intrants_extra

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const res = await buyIntrant(formData)
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
        className="block rounded-md bg-surface px-3 py-2 text-center text-sm font-semibold text-foreground border border-surface-border shadow-sm hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 flex items-center gap-2"
      >
        <ShoppingCart className="h-4 w-4" />
        {d.buy_btn}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={() => setIsOpen(false)} />

            <div className="relative transform overflow-hidden rounded-lg bg-surface text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-surface-border">
              <div className="bg-surface px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-semibold leading-6 text-foreground mb-4">
                  {d.modal.buy_title}
                </h3>
                <form action={handleSubmit} id="buy-intrant-form" className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground">{d.modal.product_bought}</label>
                    <select name="intrant_id" required className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2">
                      <option value="">{d.modal.select_product}</option>
                      {intrants.map(i => (
                        <option key={i.id} value={i.id}>{i.nom} ({d.modal.current_stock}: {i.quantite_stock})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{d.modal.quantity_bought}</label>
                    <input type="number" step="0.01" name="quantite" required className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2" />
                  </div>
                </form>
              </div>
              <div className="bg-background/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="submit"
                  form="buy-intrant-form"
                  disabled={loading}
                  className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover sm:ml-3 sm:w-auto disabled:opacity-50"
                >
                  {loading ? dict.common.saving : d.modal.buy_submit}
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
