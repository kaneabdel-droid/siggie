'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { genererFacturesCampagne } from './actions'
import { createClient } from '@/utils/supabase/client'

export default function GenererFacturesModal({
  dict,
  campagnes: propCampagnes,
}: {
  dict: any
  campagnes?: { id: string; nom: string; statut?: string }[]
}) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [campagnes, setCampagnes] = useState<any[]>(propCampagnes || [])
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const d = dict.facturation_extra

  useEffect(() => {
    if (propCampagnes && propCampagnes.length > 0) {
      setCampagnes(propCampagnes)
    }
  }, [propCampagnes])

  useEffect(() => {
    if (isOpen && (!propCampagnes || propCampagnes.length === 0)) {
      fetchCampagnes()
    }
  }, [isOpen, propCampagnes])

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
    setFeedback(null)
    const formData = new FormData(e.currentTarget)
    const campagneId = formData.get('campagne_id') as string

    if (!campagneId) {
      setLoading(false)
      setFeedback({ type: 'error', message: 'Veuillez sélectionner une campagne.' })
      return
    }

    const res = await genererFacturesCampagne(campagneId)

    setLoading(false)
    if (res?.error) {
      setFeedback({ type: 'error', message: res.error })
    } else {
      const msg = `Factures synchronisées : ${res.countCreated || 0} créée(s), ${res.countUpdated || 0} mise(s) à jour${res.countRemoved ? `, ${res.countRemoved} supprimée(s)` : ''}.`
      setFeedback({ type: 'success', message: msg })
      router.refresh()
      setTimeout(() => {
        setIsOpen(false)
        setFeedback(null)
      }, 1400)
    }
  }

  return (
    <>
      <button
        onClick={() => {
          setIsOpen(true)
          setFeedback(null)
        }}
        className="block rounded-md bg-primary px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 flex items-center gap-2"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        {d.generate_btn}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={() => !loading && setIsOpen(false)} />

            <div className="relative transform overflow-hidden rounded-lg bg-surface text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-surface-border">
              <div className="bg-surface px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="rounded-full bg-primary/10 p-2 text-primary">
                    <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                  </div>
                  <h3 className="text-lg font-semibold leading-6 text-foreground">
                    {d.modal.title}
                  </h3>
                </div>

                <p className="text-sm text-foreground-muted mb-4">
                  {d.modal.desc}
                </p>

                <div className="mb-4 rounded-md bg-background/60 p-3 border border-surface-border flex items-start gap-2.5 text-xs text-foreground-muted">
                  <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <strong>Mise à jour en temps réel :</strong> Cette régénération recalcule instantanément tous les montants (distributions d'intrants et crédits validés), ajuste les soldes restant dus et élimine les factures orphelines.
                  </div>
                </div>

                {feedback && (
                  <div className={`mb-4 rounded-md p-3 flex items-start gap-2.5 text-sm ${
                    feedback.type === 'success' 
                      ? 'bg-success/10 text-success border border-success/20' 
                      : 'bg-danger/10 text-danger border border-danger/20'
                  }`}>
                    {feedback.type === 'success' ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                    ) : (
                      <AlertCircle className="h-5 w-5 shrink-0 text-danger" />
                    )}
                    <span className="font-medium">{feedback.message}</span>
                  </div>
                )}

                <form id="generer-factures-form" onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="campagne_id" className="block text-sm font-medium text-foreground">
                      {d.modal.campaign}
                    </label>
                    <select
                      name="campagne_id"
                      id="campagne_id"
                      required
                      disabled={loading}
                      className="mt-1 block w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm disabled:opacity-50"
                    >
                      <option value="">{d.modal.select_campaign}</option>
                      {campagnes.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.nom} {c.statut ? `(${c.statut})` : ''}
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
                  className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover sm:ml-3 sm:w-auto disabled:opacity-50 items-center gap-2"
                >
                  {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
                  {loading ? d.modal.generating : d.modal.submit}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setIsOpen(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-surface px-3 py-2 text-sm font-semibold text-foreground shadow-sm ring-1 ring-inset ring-surface-border hover:bg-background sm:mt-0 sm:w-auto disabled:opacity-50"
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
