'use client'

import { useState } from 'react'
import { Landmark } from 'lucide-react'
import { updateClientSoldeInitial } from './actions'

export default function EditSoldeInitialClientModal({
  client,
  onSuccess,
  dict,
}: {
  client: any
  onSuccess: () => void
  dict: any
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [soldeInitial, setSoldeInitial] = useState(String(client.solde_initial || 0))
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await updateClientSoldeInitial(client.id, Number(soldeInitial) || 0)
    setLoading(false)

    if (res?.error) {
      setError(res.error)
    } else {
      setIsOpen(false)
      onSuccess()
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSoldeInitial(String(client.solde_initial || 0))
          setIsOpen(true)
        }}
        className="inline-flex items-center gap-1.5 rounded-md border border-surface-border bg-surface px-3 py-2 text-sm font-semibold text-foreground hover:bg-background transition-colors"
        title="Définir ou modifier le solde initial du client"
      >
        <Landmark className="h-4 w-4 text-primary" />
        <span>Solde Initial</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black/60 transition-opacity" onClick={() => setIsOpen(false)} />

            <div className="relative transform overflow-hidden rounded-xl bg-surface text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-surface-border">
              <div className="bg-surface px-4 pb-4 pt-5 sm:p-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Landmark className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      Solde Initial du Client
                    </h3>
                    <p className="text-xs text-foreground-muted">
                      {client.nom} ({client.code_client || 'Client'})
                    </p>
                  </div>
                </div>

                <p className="text-xs text-foreground-muted mb-4">
                  Saisissez la dette antérieure que ce client doit au GIE (positif) ou son acompte déjà versé (négatif) avant l&apos;utilisation de SIGGIE.
                </p>

                {error && (
                  <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-md text-xs text-danger">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Solde initial / Créance reportée (FCFA) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={soldeInitial}
                      onChange={(e) => setSoldeInitial(e.target.value)}
                      placeholder="Ex: 250000"
                      className="w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
                    />
                    <p className="mt-1 text-[11px] text-foreground-muted">
                      Montant &gt; 0 = Dette du client (s&apos;ajoute au solde dû).<br />
                      Montant &lt; 0 = Acompte du client (diminue le solde dû).
                    </p>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="rounded-md border border-surface-border bg-surface px-3 py-2 text-sm font-semibold text-foreground hover:bg-background transition-colors"
                    >
                      {dict?.common?.cancel || "Annuler"}
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-2xs hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {loading ? (dict?.common?.saving || "Enregistrement...") : (dict?.common?.save || "Enregistrer")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

