'use client'

import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { addClient } from './actions'

export default function AddClientModal({
  onCreated,
  dict,
}: {
  onCreated: (client: { id: string; nom: string; telephone: string | null }) => void
  dict: any
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const t = dict.bilans_pages.releve_client

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const nom = formData.get('nom') as string
    const telephone = formData.get('telephone') as string

    const res = await addClient(nom, telephone)
    setLoading(false)
    if (res?.error) {
      alert(res.error)
    } else if (res.client) {
      onCreated(res.client)
      setIsOpen(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-md bg-surface border border-surface-border px-3 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-background"
      >
        <UserPlus className="h-4 w-4" />
        {t.add_client}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={() => setIsOpen(false)} />

            <div className="relative transform overflow-hidden rounded-lg bg-surface text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-surface-border">
              <div className="bg-surface px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-semibold leading-6 text-foreground mb-4">
                  {t.new_client_form.title}
                </h3>
                <form id="add-client-form" onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground">{t.new_client_form.name}</label>
                    <input
                      type="text"
                      name="nom"
                      required
                      placeholder={t.new_client_form.name_placeholder}
                      className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{t.new_client_form.phone}</label>
                    <input
                      type="text"
                      name="telephone"
                      className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2"
                    />
                  </div>
                </form>
              </div>
              <div className="bg-background/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="submit"
                  form="add-client-form"
                  disabled={loading}
                  className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover sm:ml-3 sm:w-auto disabled:opacity-50"
                >
                  {loading ? dict.common.creating : t.new_client_form.submit}
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
