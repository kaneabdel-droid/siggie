'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Key, Trash2, Copy, Check, MessageSquare, Shield, AlertCircle, Settings2 } from 'lucide-react'
import {
  creerCollaborateur,
  supprimerCollaborateur,
  genererLienResetCollaborateur,
  modifierRoleEtPermissionsCollaborateur,
} from './actions'
import PermissionsMatrix from '@/app/admin/(protected)/gies/[id]/PermissionsMatrix'
import { fullPermissions, sanitizePermissions, type PermissionMap } from '@/lib/permissions'

export type CollaborateurItem = {
  id: string
  role: string | null
  identifiant: string | null
  telephone: string | null
  nom_complet: string | null
  email: string | null
  permissions: PermissionMap | null
}

export const ROLES_STANDARDS = [
  { value: 'collaborateur', label: 'Collaborateur standard' },
  { value: 'admin', label: 'Co-administrateur (accès complet)' },
  { value: 'president', label: 'Président du GIE' },
  { value: 'tresorier', label: 'Trésorier / Comptable' },
  { value: 'secretaire', label: 'Secrétaire général / Opérateur' },
  { value: 'magasinier', label: 'Magasinier (Stock & Intrants)' },
  { value: 'gestionnaire', label: 'Gestionnaire de campagne' },
  { value: 'autre', label: 'Autre rôle personnalisé...' },
]

function getRoleBadge(role: string | null) {
  const r = (role || 'collaborateur').toLowerCase()
  if (r === 'admin') {
    return 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30'
  }
  if (r === 'president') {
    return 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30'
  }
  if (r === 'tresorier' || r === 'comptable') {
    return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
  }
  if (r === 'magasinier') {
    return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
  }
  if (r === 'gestionnaire') {
    return 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30'
  }
  if (r === 'secretaire') {
    return 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30'
  }
  return 'bg-surface-border/50 text-foreground border-surface-border'
}

export default function CollaborateursSection({
  collaborateurs,
  currentUserId,
}: {
  collaborateurs: CollaborateurItem[]
  currentUserId: string
}) {
  const router = useRouter()
  const [showAddModal, setShowAddModal] = useState(false)
  const [addRole, setAddRole] = useState('collaborateur')
  const [addRoleCustom, setAddRoleCustom] = useState('')
  const [addRestrictPerms, setAddRestrictPerms] = useState(false)
  const [addCustomPerms, setAddCustomPerms] = useState<PermissionMap>(fullPermissions())

  const [selectedCollabPerms, setSelectedCollabPerms] = useState<CollaborateurItem | null>(null)
  const [editRole, setEditRole] = useState('collaborateur')
  const [editRoleCustom, setEditRoleCustom] = useState('')
  const [customPerms, setCustomPerms] = useState<PermissionMap>(fullPermissions())
  const [restrictPerms, setRestrictPerms] = useState(false)

  const [activeResetLink, setActiveResetLink] = useState<{
    link: string
    nom: string
    telephone?: string | null
    identifiant?: string | null
  } | null>(null)
  const [copied, setCopied] = useState(false)

  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Gestion de la création d'un collaborateur
  async function handleAddCollaborateur(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    const form = e.currentTarget
    const formData = new FormData(form)

    if (addRestrictPerms) {
      formData.set('permissions', JSON.stringify(addCustomPerms))
    }

    startTransition(async () => {
      const res = await creerCollaborateur(formData)
      if (res.error) {
        setErrorMsg(res.error)
      } else {
        setSuccessMsg('Collaborateur ajouté avec succès !')
        setShowAddModal(false)
        form.reset()
        setAddRole('collaborateur')
        setAddRoleCustom('')
        setAddRestrictPerms(false)
        setAddCustomPerms(fullPermissions())
        router.refresh()
        setTimeout(() => setSuccessMsg(null), 4000)
      }
    })
  }

  // Suppression
  function handleDelete(collab: CollaborateurItem) {
    const nom = collab.nom_complet || collab.identifiant || 'ce collaborateur'
    if (!confirm(`Supprimer définitivement l'accès de ${nom} ?`)) return

    setErrorMsg(null)
    startTransition(async () => {
      const res = await supprimerCollaborateur(collab.id)
      if (res.error) setErrorMsg(res.error)
      else {
        setSuccessMsg(`Accès de ${nom} révoqué.`)
        router.refresh()
        setTimeout(() => setSuccessMsg(null), 3000)
      }
    })
  }

  // Génération du lien de récupération
  function handleGenerateResetLink(collab: CollaborateurItem) {
    setErrorMsg(null)
    startTransition(async () => {
      const res = await genererLienResetCollaborateur(collab.id)
      if (res.error) {
        setErrorMsg(res.error)
      } else if (res.link) {
        setActiveResetLink({
          link: res.link,
          nom: collab.nom_complet || collab.identifiant || 'Collaborateur',
          telephone: res.telephone,
          identifiant: res.identifiant,
        })
      }
    })
  }

  // Copier le lien
  function handleCopyLink() {
    if (!activeResetLink?.link) return
    navigator.clipboard.writeText(activeResetLink.link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Ouvrir la modal d'édition
  function openEditModal(collab: CollaborateurItem) {
    setSelectedCollabPerms(collab)
    const isStandard = ROLES_STANDARDS.some(r => r.value === collab.role && r.value !== 'autre')
    if (isStandard && collab.role) {
      setEditRole(collab.role)
      setEditRoleCustom('')
    } else {
      setEditRole('autre')
      setEditRoleCustom(collab.role || '')
    }
    setCustomPerms(collab.permissions ?? fullPermissions())
    setRestrictPerms(collab.permissions !== null)
  }

  // Sauvegarder les permissions et le rôle
  function handleSavePermissions() {
    if (!selectedCollabPerms) return
    setErrorMsg(null)
    const finalRole = editRole === 'autre' ? (editRoleCustom.trim() || 'collaborateur') : editRole

    startTransition(async () => {
      const res = await modifierRoleEtPermissionsCollaborateur(
        selectedCollabPerms.id,
        finalRole,
        restrictPerms ? sanitizePermissions(customPerms) : null
      )
      if (res.error) {
        setErrorMsg(res.error)
      } else {
        setSuccessMsg('Rôle et permissions mis à jour.')
        setSelectedCollabPerms(null)
        router.refresh()
        setTimeout(() => setSuccessMsg(null), 3000)
      }
    })
  }

  return (
    <div className="mt-10 max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-heading text-foreground">Équipe & Collaborateurs</h2>
          <p className="text-sm text-foreground-muted">
            Gérez les comptes et les profils d&apos;accès de votre organisation. L&apos;e-mail n&apos;est pas obligatoire pour les collaborateurs.
          </p>
        </div>
        <button
          onClick={() => {
            setErrorMsg(null)
            setShowAddModal(true)
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover transition-colors"
        >
          <UserPlus className="h-4 w-4" /> Ajouter un collaborateur
        </button>
      </div>

      {errorMsg && (
        <div className="rounded-lg bg-danger/10 border border-danger/20 p-4 text-sm text-danger flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="rounded-lg bg-success/10 border border-success/20 p-4 text-sm text-success flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Note d'information */}
      <div className="rounded-xl border border-surface-border bg-surface/50 p-4 text-xs text-foreground-muted space-y-1">
        <p className="font-semibold text-foreground flex items-center gap-1.5">
          <Shield className="h-4 w-4 text-primary" /> Authentification simplifiée & sécurisée
        </p>
        <p>
          Vos collaborateurs peuvent se connecter avec leur identifiant (ex: <code className="font-mono text-primary">amadou_ba</code>) ou leur numéro de téléphone (ex: <code className="font-mono text-primary">+221 77 123 45 67</code>). En cas d&apos;oubli de mot de passe, vous pouvez générer ci-dessous un lien magique sécurisé à leur transmettre par WhatsApp ou SMS.
        </p>
      </div>

      {/* Liste des collaborateurs */}
      <div className="rounded-xl border border-surface-border bg-surface overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-surface-border bg-background/50 text-foreground-muted text-xs uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3.5 font-medium">Collaborateur</th>
              <th className="px-5 py-3.5 font-medium">Identifiant & Téléphone</th>
              <th className="px-5 py-3.5 font-medium">Rôle & Droits</th>
              <th className="px-5 py-3.5 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {collaborateurs.map((collab) => {
              const isCurrentUser = collab.id === currentUserId
              const isSynthetic = collab.email?.endsWith('@auth.dembasolution.internal')
              const displayName = collab.nom_complet || collab.identifiant || (isSynthetic ? 'Collaborateur' : collab.email)
              const roleDisplay = collab.role || 'collaborateur'

              return (
                <tr key={collab.id} className="hover:bg-background/40 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-medium text-foreground">{displayName}</div>
                    {!isSynthetic && collab.email && (
                      <div className="text-xs text-foreground-muted">{collab.email}</div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs space-y-0.5">
                    {collab.identifiant && (
                      <div className="font-mono text-foreground font-semibold">@{collab.identifiant}</div>
                    )}
                    {collab.telephone ? (
                      <div className="text-foreground-muted font-mono">📞 {collab.telephone}</div>
                    ) : (
                      <div className="text-foreground-muted italic">Sans téléphone</div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs">
                    <div className="inline-flex items-center gap-1.5 flex-wrap">
                      <span className={`rounded-full px-2.5 py-0.5 font-medium capitalize border text-[11px] ${getRoleBadge(collab.role)}`}>
                        {roleDisplay}
                      </span>
                      {collab.permissions ? (
                        <span className="text-[11px] text-primary font-medium">(droits restreints)</span>
                      ) : (
                        <span className="text-[11px] text-foreground-muted">(accès complet)</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right space-x-2">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleGenerateResetLink(collab)}
                      title="Générer un lien magique de réinitialisation"
                      className="inline-flex items-center gap-1 rounded-md border border-surface-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-surface transition-colors disabled:opacity-50"
                    >
                      <Key className="h-3.5 w-3.5 text-primary" /> Réinitialiser
                    </button>

                    {!isCurrentUser && (
                      <>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => openEditModal(collab)}
                          className="inline-flex items-center gap-1 rounded-md border border-surface-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-surface transition-colors disabled:opacity-50"
                        >
                          <Settings2 className="h-3.5 w-3.5 text-foreground-muted" /> Rôle & Droits
                        </button>

                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleDelete(collab)}
                          title="Supprimer l'accès"
                          className="inline-flex items-center p-1.5 rounded-md text-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
            {collaborateurs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-foreground-muted text-sm">
                  Aucun autre collaborateur enregistré.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal : Lien de réinitialisation généré */}
      {activeResetLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-surface-border bg-surface p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold font-heading text-foreground">
              Lien de réinitialisation de mot de passe
            </h3>
            <p className="text-sm text-foreground-muted">
              Transmettez ce lien magique sécurisé à <strong>{activeResetLink.nom}</strong>. Ce lien lui permettra de définir son nouveau mot de passe directement sans passer par un e-mail.
            </p>

            <div className="flex items-center gap-2 rounded-lg border border-surface-border bg-background p-2.5">
              <input
                type="text"
                readOnly
                value={activeResetLink.link}
                className="w-full bg-transparent text-xs text-foreground font-mono focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex shrink-0 items-center gap-1 rounded bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copié !' : 'Copier'}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              {activeResetLink.telephone ? (
                <a
                  href={`https://wa.me/${activeResetLink.telephone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                    `Bonjour ${activeResetLink.nom}, voici votre lien pour réinitialiser votre mot de passe SIGGIE : ${activeResetLink.link}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-md bg-[#25D366] text-white px-3 py-2 text-xs font-semibold hover:opacity-95 transition-opacity"
                >
                  <MessageSquare className="h-4 w-4" /> Envoyer par WhatsApp
                </a>
              ) : (
                <span className="text-xs text-foreground-muted italic">
                  Aucun numéro de téléphone configuré pour WhatsApp.
                </span>
              )}

              <button
                type="button"
                onClick={() => setActiveResetLink(null)}
                className="rounded-md border border-surface-border px-4 py-2 text-xs font-medium text-foreground hover:bg-background transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal : Ajouter un collaborateur */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="my-8 w-full max-w-xl rounded-xl border border-surface-border bg-surface p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold font-heading text-foreground">
              Ajouter un collaborateur
            </h3>
            <p className="text-xs text-foreground-muted">
              L&apos;adresse e-mail est facultative pour les collaborateurs. Seul l&apos;identifiant ou téléphone est requis.
            </p>

            <form onSubmit={handleAddCollaborateur} className="space-y-4 text-sm">
              {errorMsg && (
                <div className="rounded-lg bg-danger/10 border border-danger/20 p-3 text-xs text-danger flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Identifiant de connexion *
                </label>
                <input
                  name="identifiant"
                  required
                  placeholder="ex: amadou_ba ou 771234567"
                  className="w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground text-sm font-mono focus:border-primary focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-foreground-muted">
                  Sera utilisé pour la connexion à la place de l&apos;e-mail.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Nom complet
                </label>
                <input
                  name="nom_complet"
                  placeholder="ex: Amadou Bâ"
                  className="w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground text-sm focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Téléphone (recommandé)
                  </label>
                  <input
                    name="telephone"
                    type="tel"
                    placeholder="ex: +221 77 123 45 67"
                    className="w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground text-sm font-mono focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    E-mail (facultatif)
                  </label>
                  <input
                    name="email"
                    type="email"
                    placeholder="Optionnel"
                    className="w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Mot de passe temporaire initial *
                </label>
                <input
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  placeholder="Au moins 6 caractères"
                  className="w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground text-sm focus:border-primary focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-foreground">
                  Rôle & Titre dans le GIE
                </label>
                <select
                  name="role"
                  value={addRole}
                  onChange={(e) => setAddRole(e.target.value)}
                  className="w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground text-sm focus:border-primary focus:outline-none"
                >
                  {ROLES_STANDARDS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>

                {addRole === 'autre' && (
                  <div className="mt-2">
                    <input
                      name="role_custom"
                      required
                      value={addRoleCustom}
                      onChange={(e) => setAddRoleCustom(e.target.value)}
                      placeholder="Précisez le rôle (ex: Responsable aménagement, Agent de collecte...)"
                      className="w-full rounded-md border border-primary bg-background px-3 py-2 text-foreground text-sm focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Option personnalisation immédiate des permissions */}
              <div className="pt-2 border-t border-surface-border/50">
                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addRestrictPerms}
                    onChange={(e) => setAddRestrictPerms(e.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                  Personnaliser / Restreindre les permissions d&apos;accès aux modules dès la création
                </label>

                {addRestrictPerms && (
                  <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border border-surface-border p-3 bg-background/50">
                    <PermissionsMatrix
                      value={addCustomPerms}
                      onChange={setAddCustomPerms}
                      disabled={isPending}
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-md border border-surface-border px-4 py-2 text-xs font-medium text-foreground hover:bg-background transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-md bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
                >
                  {isPending ? 'Création en cours...' : 'Créer le collaborateur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal : Modification du rôle et des permissions */}
      {selectedCollabPerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="my-8 w-full max-w-2xl rounded-xl border border-surface-border bg-surface p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold font-heading text-foreground">
              Rôle et permissions de {selectedCollabPerms.nom_complet || selectedCollabPerms.identifiant}
            </h3>

            {/* Modifier le rôle */}
            <div className="space-y-2 p-3 rounded-lg border border-surface-border bg-background/50">
              <label className="block text-xs font-semibold text-foreground">
                Rôle attribué dans le GIE
              </label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground text-sm focus:border-primary focus:outline-none"
              >
                {ROLES_STANDARDS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>

              {editRole === 'autre' && (
                <div className="mt-2">
                  <input
                    value={editRoleCustom}
                    onChange={(e) => setEditRoleCustom(e.target.value)}
                    placeholder="Précisez le rôle personnalisé (ex: Responsable technique...)"
                    className="w-full rounded-md border border-primary bg-background px-3 py-2 text-foreground text-sm focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Permissions */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={restrictPerms}
                  onChange={(e) => setRestrictPerms(e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                Restreindre l&apos;accès à certains modules (sinon accès complet à l&apos;application)
              </label>

              {restrictPerms && (
                <div className="max-h-96 overflow-y-auto rounded-lg border border-surface-border p-3">
                  <PermissionsMatrix
                    value={customPerms}
                    onChange={setCustomPerms}
                    disabled={isPending}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-surface-border">
              <button
                type="button"
                onClick={() => setSelectedCollabPerms(null)}
                className="rounded-md border border-surface-border px-4 py-2 text-xs font-medium text-foreground hover:bg-background transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleSavePermissions}
                className="rounded-md bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {isPending ? 'Enregistrement...' : 'Enregistrer le rôle et les permissions'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
