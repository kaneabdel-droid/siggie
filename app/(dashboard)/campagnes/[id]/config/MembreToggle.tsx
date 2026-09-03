'use client'

import { useState, useTransition } from 'react'
import { toggleMembreCampagne } from './actions'

export default function MembreToggle({ 
  campagneId, 
  membreId, 
  isEnrolledInitial 
}: { 
  campagneId: string, 
  membreId: string, 
  isEnrolledInitial: boolean 
}) {
  const [isPending, startTransition] = useTransition()
  const [isEnrolled, setIsEnrolled] = useState(isEnrolledInitial)

  const handleToggle = () => {
    const currentEnrolled = isEnrolled
    setIsEnrolled(!currentEnrolled) // Optimistic update
    
    startTransition(async () => {
      const res = await toggleMembreCampagne(campagneId, membreId, currentEnrolled)
      if (res?.error) {
        alert(res.error)
        setIsEnrolled(currentEnrolled) // Revert on error
      }
    })
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isEnrolled}
      onClick={handleToggle}
      disabled={isPending}
      className={`
        relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
        ${isEnrolled ? 'bg-primary' : 'bg-surface-border'}
        ${isPending ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <span className="sr-only">Inscrire le membre</span>
      <span
        aria-hidden="true"
        className={`
          pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
          ${isEnrolled ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </button>
  )
}
