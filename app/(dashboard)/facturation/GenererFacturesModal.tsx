'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { genererFacturesCampagne } from './actions'
import { createClient } from '@/utils/supabase/client'

export default function GenererFacturesModal({ dict }: { dict: any }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [campagnes, setCampagnes] = useState<any[]>([])
  const d = dict.facturation_extra

  useEffect(() => {
    if (isOpen) {
      fetchCampagnes()
    }
  }, [isOpen])

  async function fetchCampagnes() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('campagnes')
      .select('id, nom, statut')
      .order('date_debut', { ascending: false })
      
    if (data) setCampagnes(data)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const campagneId = formData.get('campagne_id') as string

    const res = await genererFacturesCampagne(campagneId)
    
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
        className="block rounded-md bg-primary px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        {d.generate_btn}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={() => setIsOpen(false)} />

            <div className="relative transform overflow-hidden rounded-lg bg-surface text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-surface-border">
              <div className="bg-surface px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-semibold leading-6 text-foreground mb-4">
                  {d.modal.title}
                </h3>
                <p className="text-sm text-foreground-muted mb-4">
                  {d.modal.desc}
                </p>
                <form id="generer-factures-form" onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="campagne_id" className="block text-sm font-medium text-foreground">{d.modal.campaign}</label>
                    <select
                      name="campagne_id"
                      id="campagne_id"
                      required
                      className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                    >
                      <option value="">{d.modal.select_campaign}</option>
                      {campagnes.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.nom} ({c.statut})
                        </option>
                      ))}
                    </select>
                  </div>
                </form>
              </div>
              <div className="bg-background/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="submit"
                  form="generer-factures-form"
                  disabled={loading}
                  className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 sm:ml-3 sm:w-auto disabled:opacity-50"
                >
                  {loading ? d.modal.generating : d.modal.submit}
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
