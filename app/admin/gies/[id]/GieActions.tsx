'use client'

import { useState, useTransition } from 'react'
import { changerForfait, prolongerEssai, verrouillerCompte, deverrouillerCompte } from '../actions'

export default function GieActions({
  gieId,
  forfaitActuel,
  verrouille,
}: {
  gieId: string
  forfaitActuel: string
  verrouille: boolean
}) {
  const [forfait, setForfait] = useState(forfaitActuel)
  const [jours, setJours] = useState(7)
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  const run = (action: () => Promise<{ success?: boolean; error?: string }>) => {
    setMessage(null)
    startTransition(async () => {
      try {
        const result = await action()
        setMessage(result.error ? `Erreur : ${result.error}` : 'Effectué.')
      } catch (err) {
        setMessage(`Erreur inattendue : ${err instanceof Error ? err.message : String(err)}`)
      }
    })
  }

  return (
    <div className="bg-background rounded-xl p-5 border border-surface-border">
      <h2 className="font-semibold mb-4">Actions</h2>

      {message && <p className="text-sm mb-4 text-foreground-muted">{message}</p>}

      <div className="flex flex-wrap items-end gap-6">
        <div>
          <label className="block text-xs text-foreground-muted mb-1">Changer le forfait</label>
          <div className="flex gap-2">
            <select value={forfait} onChange={(e) => setForfait(e.target.value)} className="rounded-md border border-surface-border bg-surface px-3 py-2 text-sm">
              <option value="standard">Standard</option>
              <option value="medium">Medium</option>
              <option value="premium">Premium</option>
            </select>
            <button
              disabled={isPending}
              onClick={() => run(() => changerForfait(gieId, forfait))}
              className="rounded-md bg-primary text-white px-3 py-2 text-sm font-medium disabled:opacity-50"
            >
              Appliquer
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs text-foreground-muted mb-1">Prolonger l&apos;essai (jours)</label>
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              value={jours}
              onChange={(e) => setJours(parseInt(e.target.value, 10) || 1)}
              className="w-20 rounded-md border border-surface-border bg-surface px-3 py-2 text-sm"
            />
            <button
              disabled={isPending}
              onClick={() => run(() => prolongerEssai(gieId, jours))}
              className="rounded-md bg-primary text-white px-3 py-2 text-sm font-medium disabled:opacity-50"
            >
              Prolonger
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs text-foreground-muted mb-1">Accès</label>
          {verrouille ? (
            <button
              disabled={isPending}
              onClick={() => run(() => deverrouillerCompte(gieId))}
              className="rounded-md bg-success text-white px-3 py-2 text-sm font-medium disabled:opacity-50"
            >
              Déverrouiller
            </button>
          ) : (
            <button
              disabled={isPending}
              onClick={() => run(() => verrouillerCompte(gieId))}
              className="rounded-md bg-danger text-white px-3 py-2 text-sm font-medium disabled:opacity-50"
            >
              Verrouiller
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
