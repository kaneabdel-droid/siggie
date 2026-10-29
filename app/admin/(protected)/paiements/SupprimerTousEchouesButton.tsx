'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { supprimerTousPaiementsEchoues } from './actions'

export default function SupprimerTousEchouesButton({ count }: { count: number }) {
  const [isPending, startTransition] = useTransition()
  const [erreur, setErreur] = useState<string | null>(null)

  if (count <= 0) return null

  const handleSupprimerTous = () => {
    if (!confirm(`Supprimer définitivement les ${count} paiement(s) échoué(s) ?`)) return
    setErreur(null)
    startTransition(async () => {
      try {
        const result = await supprimerTousPaiementsEchoues()
        if (result?.error) setErreur(result.error)
      } catch (err) {
        setErreur(err instanceof Error ? err.message : String(err))
      }
    })
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={handleSupprimerTous}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-danger/10 text-danger hover:bg-danger/20 transition-colors disabled:opacity-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Supprimer les paiements échoués ({count})
      </button>
      {erreur && <span className="text-xs text-danger">{erreur}</span>}
    </div>
  )
}
