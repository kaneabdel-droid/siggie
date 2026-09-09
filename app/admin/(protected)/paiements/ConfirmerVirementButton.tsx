'use client'

import { useTransition } from 'react'
import { confirmerVirement } from './actions'

export default function ConfirmerVirementButton({ paymentId }: { paymentId: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          try {
            const result = await confirmerVirement(paymentId)
            if (result.error) alert(result.error)
          } catch (err) {
            alert(`Erreur inattendue : ${err instanceof Error ? err.message : String(err)}`)
          }
        })
      }
      className="rounded-md bg-success text-white px-3 py-1.5 text-xs font-medium disabled:opacity-50"
    >
      {isPending ? 'Confirmation...' : 'Confirmer le virement'}
    </button>
  )
}
