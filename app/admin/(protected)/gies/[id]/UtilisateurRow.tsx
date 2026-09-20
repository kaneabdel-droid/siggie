'use client'

import { useState, useTransition } from 'react'
import PermissionsMatrix from './PermissionsMatrix'
import { fullPermissions, sanitizePermissions, type PermissionMap } from '@/lib/permissions'
import { changerPermissionsUtilisateur, changerRoleUtilisateur, retirerUtilisateurDuGie, desactiverCompteUtilisateur, reactiverCompteUtilisateur } from '../actions'

export default function UtilisateurRow({
  gieId,
  utilisateurId,
  email,
  roleActuel,
  permissionsActuelles,
  banni,
}: {
  gieId: string
  utilisateurId: string
  email: string
  roleActuel: string
  permissionsActuelles: PermissionMap | null
  banni: boolean
}) {
  const [role, setRole] = useState(roleActuel)
  const [showPerms, setShowPerms] = useState(false)
  const [custom, setCustom] = useState(permissionsActuelles !== null)
  const [perms, setPerms] = useState<PermissionMap>(permissionsActuelles ?? fullPermissions())
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
        <button
          type="button"
          onClick={() => setShowPerms((v) => !v)}
          className="rounded-md bg-surface-border text-foreground px-2 py-1 text-xs font-medium"
        >
          Permissions {permissionsActuelles === null ? '(accès complet)' : '(personnalisées)'}
        </button>
      </div>

      {showPerms && (
        <div className="space-y-3 rounded-md border border-surface-border p-3">
          {roleActuel === 'admin' ? (
            <p className="text-xs text-foreground-muted">Le rôle « admin » a toujours accès à tout : les permissions ne s&apos;appliquent pas.</p>
          ) : (
            <>
              <label className="flex items-center gap-2 text-xs text-foreground">
                <input type="checkbox" checked={custom} disabled={isPending} onChange={(e) => setCustom(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
                Restreindre l&apos;accès (sinon : accès complet à toutes les pages et actions)
              </label>
              {custom && <PermissionsMatrix value={perms} onChange={setPerms} disabled={isPending} />}
              <button
                type="button"
                disabled={isPending}
                onClick={() => run(() => changerPermissionsUtilisateur(gieId, utilisateurId, custom ? sanitizePermissions(perms) : null))}
                className="rounded-md bg-primary text-white px-3 py-1.5 text-xs font-medium disabled:opacity-50"
              >
                Enregistrer les permissions
              </button>
            </>
          )}
        </div>
      )}
    </li>
  )
}
