'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/**
 * Fenêtre modale rendue directement dans <body> : elle n'hérite pas des styles de la cellule de tableau qui l'ouvre
 * (white-space: nowrap, alignement à droite). Plein écran en bas sur téléphone, centrée sur grand écran ; seul le corps
 * défile, l'en-tête et les boutons restent visibles.
 */
export default function Modal({
  title,
  onClose,
  footer,
  children,
  maxWidth = 'sm:max-w-2xl',
}: {
  title: string
  onClose: () => void
  footer?: React.ReactNode
  children: React.ReactNode
  maxWidth?: string
}) {
  useEffect(() => {
    const precedent = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const echap = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', echap)
    return () => {
      document.body.style.overflow = precedent
      window.removeEventListener('keydown', echap)
    }
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center whitespace-normal text-start sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/75" onClick={onClose} />
      <div className={`relative flex max-h-[100dvh] w-full min-w-0 flex-col overflow-hidden rounded-t-xl border border-surface-border bg-surface shadow-xl sm:max-h-[90dvh] sm:rounded-lg ${maxWidth}`}>
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-surface-border px-4 py-3 sm:px-6">
          <h3 className="min-w-0 break-words text-lg font-semibold leading-6 text-foreground">{title}</h3>
          <button type="button" onClick={onClose} aria-label="×" className="-me-1 shrink-0 rounded-md p-1 text-foreground-muted hover:bg-background hover:text-foreground">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">{children}</div>
        {footer && (
          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-surface-border bg-background/50 px-4 py-3 sm:flex-row sm:justify-end sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
