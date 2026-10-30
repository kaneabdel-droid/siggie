'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { supprimerPaiement } from './actions'

export default function SupprimerPaiementButton({
  paymentId,
  confirmation = 'Supprimer ce paiement ?',
}: {
  paymentId: string
  confirmation?: string
}) {
  const [isPending, startTransition] = useTransition()
  const [erreur, setErreur] = useState<string | null>(null)

  const handleSupprimer = () => {
    if (!confirm(confirmation)) return
    setErreur(null)
    startTransition(async () => {
      try {
        const result = await supprimerPaiement(paymentId)
        if (result?.error) setErreur(result.error)
      } catch (err) {
        setErreur(err instanceof Error ? err.message : String(err))
      }
    })
  }

  return (
    <div className="inline-flex items-center">
      <button
        onClick={handleSupprimer}
        disabled={isPending}
        title="Supprimer ce paiement"
        className="text-foreground-muted hover:text-danger p-1 rounded transition-colors disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      {erreur && <span className="ml-1 text-xs text-danger">{erreur}</span>}
    </div>
  )
}

