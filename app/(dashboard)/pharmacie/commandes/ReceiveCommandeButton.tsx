'use client'

import { useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { accuserReception } from './actions'

export default function ReceiveCommandeButton({ commandeId }: { commandeId: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleReception = async () => {
    if (!window.confirm("Avez-vous bien contrôlé la marchandise reçue (quantité et qualité) ?")) return;
    
    setIsSubmitting(true)
    await accuserReception(commandeId)
    setIsSubmitting(false)
  }

  return (
    <button
      onClick={handleReception}
      disabled={isSubmitting}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-success/10 text-success hover:bg-success/20 transition-colors disabled:opacity-50"
      title="Accuser réception"
    >
      <CheckCircle className="w-4 h-4" />
      {isSubmitting ? '...' : 'Valider réception'}
    </button>
  )
}
