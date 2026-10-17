'use client'

import { useState, useTransition } from 'react'
import { UserPlus, Key, Trash2, Copy, Check, MessageSquare, Shield, AlertCircle } from 'lucide-react'
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

export default function CollaborateursSection({
  collaborateurs,
  currentUserId,
}: {
  collaborateurs: CollaborateurItem[]
  currentUserId: string
}) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedCollabPerms, setSelectedCollabPerms] = useState<CollaborateurItem | null>(null)
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

    startTransition(async () => {
      const res = await creerCollaborateur(formData)
      if (res.error) {
        setErrorMsg(res.error)
      } else {
        setSuccessMsg('Collaborateur ajouté avec succès !')
        setShowAddModal(false)
        form.reset()
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

  // Sauvegarder les permissions
  function handleSavePermissions() {
    if (!selectedCollabPerms) return
    setErrorMsg(null)
    startTransition(async () => {
      const res = await modifierRoleEtPermissionsCollaborateur(
        selectedCollabPerms.id,
        selectedCollabPerms.role || 'collaborateur',
        restrictPerms ? sanitizePermissions(customPerms) : null
      )
      if (res.error) setErrorMsg(res.error)
      else {
        setSuccessMsg('Permissions mises à jour.')
        setSelectedCollabPerms(null)
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
            Gérez les comptes des collaborateurs de votre organisation. L&apos;e-mail n&apos;est pas requis pour les collaborateurs.
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
          Vos employés peuvent se connecter avec leur identifiant (ex: <code className="font-mono text-primary">amadou_ba</code>) ou leur numéro de téléphone (ex: <code className="font-mono text-primary">+221 77 123 45 67</code>). En cas d&apos;oubli de mot de passe, vous pouvez générer ci-dessous un lien magique sécurisé à leur transmettre par WhatsApp ou SMS.
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
                    <div className="inline-flex items-center gap-1.5">
                      <span className="rounded-full bg-surface-border px-2.5 py-0.5 font-medium capitalize text-foreground">
                        {collab.role || 'collaborateur'}
                      </span>
                      {collab.permissions ? (
                        <span className="text-[11px] text-primary">(droits restreints)</span>
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
                          onClick={() => {
                            setSelectedCollabPerms(collab)
                            setCustomPerms(collab.permissions ?? fullPermissions())
                            setRestrictPerms(collab.permissions !== null)
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-surface-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-surface transition-colors disabled:opacity-50"
                        >
                          Permissions
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
          <div className="my-8 w-full max-w-lg rounded-xl border border-surface-border bg-surface p-6 shadow-xl space-y-4">
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

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Rôle dans le GIE
                </label>
                <select
                  name="role"
                  defaultValue="collaborateur"
                  className="w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground text-sm focus:border-primary focus:outline-none"
                >
                  <option value="collaborateur">Collaborateur standard</option>
                  <option value="tresorier">Trésorier / Comptable</option>
                  <option value="magasinier">Magasinier (Stock & Intrants)</option>
                  <option value="gestionnaire">Gestionnaire de campagne</option>
                </select>
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

      {/* Modal : Modification des permissions */}
      {selectedCollabPerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="my-8 w-full max-w-2xl rounded-xl border border-surface-border bg-surface p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold font-heading text-foreground">
              Permissions de {selectedCollabPerms.nom_complet || selectedCollabPerms.identifiant}
            </h3>

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
                {isPending ? 'Enregistrement...' : 'Enregistrer les permissions'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
