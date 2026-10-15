'use client'

import { useState, useTransition } from 'react'
import { UserPlus } from 'lucide-react'
import { creerUtilisateurPourGie } from '../actions'
import PermissionsMatrix from './PermissionsMatrix'
import { readOnlyPermissions, sanitizePermissions, type PermissionMap } from '@/lib/permissions'

function genererMotDePasse(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const bytes = new Uint32Array(12)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

export default function AjouterUtilisateurButton({ gieId }: { gieId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [identifiant, setIdentifiant] = useState('')
  const [nomComplet, setNomComplet] = useState('')
  const [telephone, setTelephone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('employe')
  const [custom, setCustom] = useState(true)
  const [perms, setPerms] = useState<PermissionMap>(readOnlyPermissions())
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const close = () => {
    setIsOpen(false)
    setIdentifiant('')
    setNomComplet('')
    setTelephone('')
    setEmail('')
    setPassword('')
    setRole('employe')
    setCustom(true)
    setPerms(readOnlyPermissions())
    setMessage(null)
    setSuccess(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setSuccess(null)
    startTransition(async () => {
      try {
        const idPrincipal = identifiant.trim() || email.trim()
        if (!idPrincipal) {
          setMessage("L'identifiant est obligatoire.")
          return
        }

        const result = await creerUtilisateurPourGie(
          gieId,
          idPrincipal,
          password,
          role,
          custom && role.trim() !== 'admin' ? sanitizePermissions(perms) : null,
          {
            email: email.trim() || undefined,
            telephone: telephone.trim() || undefined,
            nomComplet: nomComplet.trim() || undefined,
          }
        )
        if (result.error) {
          setMessage(`Erreur : ${result.error}`)
        } else {
          setSuccess(`Compte créé pour ${nomComplet || idPrincipal}. Identifiant : ${idPrincipal} — Mot de passe : ${password} (à transmettre à l'utilisateur, il ne sera plus affiché).`)
          setIdentifiant('')
          setNomComplet('')
          setTelephone('')
          setEmail('')
          setPassword('')
        }
      } catch (err) {
        setMessage(`Erreur inattendue : ${err instanceof Error ? err.message : String(err)}`)
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover"
      >
        <UserPlus className="h-4 w-4" /> Ajouter un utilisateur
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={close} />

            <div className="relative transform overflow-hidden rounded-lg bg-surface text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl border border-surface-border">
              <div className="bg-surface px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-semibold leading-6 text-foreground mb-4">
                  Ajouter un utilisateur à ce GIE
                </h3>

                {success ? (
                  <p className="text-sm text-success bg-success/10 border border-success/20 rounded-md p-3">{success}</p>
                ) : (
                  <form id="add-user-form" onSubmit={handleSubmit} className="space-y-4">
                    {message && <p className="text-xs text-danger">{message}</p>}
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground">
                          Identifiant de connexion <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="ex: moussa_caisse ou 771234567"
                          value={identifiant}
                          onChange={(e) => setIdentifiant(e.target.value)}
                          disabled={isPending}
                          className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm"
                        />
                        <p className="mt-1 text-xs text-foreground-muted">Sert à se connecter (sans besoin d&apos;email).</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground">Nom & Prénom</label>
                        <input
                          type="text"
                          placeholder="ex: Moussa Diop"
                          value={nomComplet}
                          onChange={(e) => setNomComplet(e.target.value)}
                          disabled={isPending}
                          className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground">Numéro de téléphone</label>
                        <input
                          type="text"
                          placeholder="ex: +221 77 123 45 67"
                          value={telephone}
                          onChange={(e) => setTelephone(e.target.value)}
                          disabled={isPending}
                          className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm"
                        />
                        <p className="mt-1 text-xs text-foreground-muted">Peut servir d&apos;identifiant et pour le mot de passe.</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground">
                          Email <span className="text-xs text-foreground-muted">(facultatif pour les employés)</span>
                        </label>
                        <input
                          type="email"
                          placeholder="facultatif"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={isPending}
                          className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground">Mot de passe temporaire</label>
                      <div className="mt-1 flex gap-2">
                        <input
                          type="text"
                          required
                          minLength={6}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={isPending}
                          className="block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2"
                        />
                        <button
                          type="button"
                          onClick={() => setPassword(genererMotDePasse())}
                          disabled={isPending}
                          className="shrink-0 rounded-md bg-surface-border px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-border/70"
                        >
                          Générer
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-foreground-muted">À transmettre vous-même à l&apos;utilisateur (il pourra le changer après connexion).</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground">Rôle</label>
                      <input
                        type="text"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        disabled={isPending}
                        placeholder="Ex: employe, gerant, admin..."
                        className="mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2"
                      />
                    </div>
                    {role.trim() !== 'admin' && (
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <input type="checkbox" checked={custom} disabled={isPending} onChange={(e) => setCustom(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
                          Restreindre les pages et actions accessibles
                        </label>
                        {custom ? (
                          <PermissionsMatrix value={perms} onChange={setPerms} disabled={isPending} />
                        ) : (
                          <p className="text-xs text-foreground-muted">Accès complet à toutes les pages et actions.</p>
                        )}
                      </div>
                    )}
                  </form>
                )}
              </div>
              <div className="bg-background/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                {!success && (
                  <button
                    type="submit"
                    form="add-user-form"
                    disabled={isPending}
                    className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover sm:ml-3 sm:w-auto disabled:opacity-50"
                  >
                    {isPending ? 'Création...' : 'Créer le compte'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={close}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-surface px-3 py-2 text-sm font-semibold text-foreground shadow-sm ring-1 ring-inset ring-surface-border hover:bg-background sm:mt-0 sm:w-auto"
                >
                  {success ? 'Fermer' : 'Annuler'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
