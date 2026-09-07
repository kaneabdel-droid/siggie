'use client'

import { useState, useTransition } from 'react'
import { changerRoleUtilisateur, retirerUtilisateurDuGie, desactiverCompteUtilisateur, reactiverCompteUtilisateur } from '../actions'

export default function UtilisateurRow({
  gieId,
  utilisateurId,
  email,
  roleActuel,
  banni,
}: {
  gieId: string
  utilisateurId: string
  email: string
  roleActuel: string
  banni: boolean
}) {
  const [role, setRole] = useState(roleActuel)
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  const run = (action: () => Promise<{ success?: boolean; error?: string }>) => {
    setMessage(null)
    startTransition(async () => {
      try {
        const result = await action()
        if (result.error) setMessage(`Erreur : ${result.error}`)
      } catch (err) {
        setMessage(`Erreur inattendue : ${err instanceof Error ? err.message : String(err)}`)
      }
    })
  }

  const handleRetirer = () => {
    if (!confirm(`Retirer ${email} de ce GIE et désactiver son compte ? Cette action est difficile à annuler.`)) return
    run(() => retirerUtilisateurDuGie(gieId, utilisateurId))
  }

  return (
    <li className="py-3 space-y-2">
      <div className="flex justify-between items-center gap-2">
        <span className="truncate">{email}</span>
        {banni && <span className="text-xs text-danger font-medium shrink-0">Désactivé</span>}
      </div>

      {message && <p className="text-xs text-danger">{message}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          disabled={isPending}
          className="w-28 rounded-md border border-surface-border bg-surface px-2 py-1 text-xs"
        />
        <button
          disabled={isPending || role.trim() === roleActuel}
          onClick={() => run(() => changerRoleUtilisateur(gieId, utilisateurId, role))}
          className="rounded-md bg-primary text-white px-2 py-1 text-xs font-medium disabled:opacity-50"
        >
          Changer le rôle
        </button>

        {banni ? (
          <button
            disabled={isPending}
            onClick={() => run(() => reactiverCompteUtilisateur(gieId, utilisateurId))}
            className="rounded-md bg-success text-white px-2 py-1 text-xs font-medium disabled:opacity-50"
          >
            Réactiver
          </button>
        ) : (
          <button
            disabled={isPending}
            onClick={() => run(() => desactiverCompteUtilisateur(gieId, utilisateurId))}
            className="rounded-md bg-warning text-white px-2 py-1 text-xs font-medium disabled:opacity-50"
          >
            Désactiver
          </button>
        )}

        <button
          disabled={isPending}
          onClick={handleRetirer}
          className="rounded-md bg-danger text-white px-2 py-1 text-xs font-medium disabled:opacity-50"
        >
          Retirer du GIE
        </button>
      </div>
    </li>
  )
}
