'use client'

import { useState } from 'react'
import { Percent } from 'lucide-react'
import { calculerInteret } from './actions'

export default function CalculInteretModal({
  campagnes,
  dict,
}: {
  campagnes: { id: string; nom: string }[]
  dict: any
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const t = dict.facturation_extra.interet

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const campagneId = formData.get('campagne_id') as string
    const methode = formData.get('methode') as 'superficie' | 'intrants'

    const res = await calculerInteret(campagneId, methode)
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
        className="inline-flex items-center gap-2 rounded-md bg-surface border border-surface-border px-3 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-background"
      >
        <Percent className="h-4 w-4" />
        {t.btn}
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
                <p className="text-sm text-foreground-muted mb-4">{t.desc}</p>
                <form id="calcul-interet-form" onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground">{t.campaign}</label>
                    <select
                      name="campagne_id"
                      required
                      className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                    >
                      <option value="">{t.select_campaign}</option>
                      {campagnes.map((c) => (
                        <option key={c.id} value={c.id}>{c.nom}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">{t.method_label}</label>
                    <label className="flex items-start gap-2 p-3 rounded-md border border-surface-border cursor-pointer hover:bg-background">
                      <input type="radio" name="methode" value="superficie" defaultChecked className="mt-1" />
                      <span className="text-sm text-foreground">{t.method_superficie}</span>
                    </label>
                    <label className="flex items-start gap-2 p-3 rounded-md border border-surface-border cursor-pointer hover:bg-background">
                      <input type="radio" name="methode" value="intrants" className="mt-1" />
                      <span className="text-sm text-foreground">{t.method_intrants}</span>
                    </label>
                  </div>
                </form>
              </div>
              <div className="bg-background/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="submit"
                  form="calcul-interet-form"
                  disabled={loading}
                  className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 sm:ml-3 sm:w-auto disabled:opacity-50"
                >
                  {loading ? t.calculating : t.submit}
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
