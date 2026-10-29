'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  UserPlus,
  Key,
  Trash2,
  Copy,
  Check,
  MessageSquare,
  Shield,
  AlertCircle,
  Settings2,
  Phone,
  X,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react'
import {
  creerCollaborateur,
  supprimerCollaborateur,
  genererLienResetCollaborateur,
  modifierRoleEtPermissionsCollaborateur,
  modifierMotDePasseCollaborateur,
} from './actions'
import PermissionsMatrix from '@/app/admin/(protected)/gies/[id]/PermissionsMatrix'
import {
  defaultPermissionsForRole,
  fullPermissions,
  readOnlyPermissions,
  sanitizePermissions,
  type PermissionMap,
} from '@/lib/permissions'

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
  // Liste locale des collaborateurs pour mise à jour visuelle instantanée
  const [collabList, setCollabList] = useState<CollaborateurItem[]>(collaborateurs)
  useEffect(() => {
    setCollabList(collaborateurs)
  }, [collaborateurs])

  const [showAddModal, setShowAddModal] = useState(false)
  const [addRole, setAddRole] = useState('collaborateur')
  const [addRoleCustom, setAddRoleCustom] = useState('')
  const [addRestrictPerms, setAddRestrictPerms] = useState(true)
  const [addCustomPerms, setAddCustomPerms] = useState<PermissionMap>(
    () => defaultPermissionsForRole('collaborateur') ?? readOnlyPermissions()
  )
  const [showAddPassword, setShowAddPassword] = useState(false)
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false)

  // Carte récapitulative affichée en haut après création réussie
  const [createdSuccessInfo, setCreatedSuccessInfo] = useState<{
    nom: string
    identifiant: string
    telephone?: string | null
    email?: string | null
    role: string
    password?: string
  } | null>(null)
  const [copiedSuccess, setCopiedSuccess] = useState(false)
  const [showCreatedPassword, setShowCreatedPassword] = useState(false)

  // Édition rôle & permissions
  const [selectedCollabPerms, setSelectedCollabPerms] = useState<CollaborateurItem | null>(null)
  const [editRole, setEditRole] = useState('collaborateur')
  const [editRoleCustom, setEditRoleCustom] = useState('')
  const [customPerms, setCustomPerms] = useState<PermissionMap>(fullPermissions())
  const [restrictPerms, setRestrictPerms] = useState(false)

  // Réinitialisation directe ou lien magique
  const [activeResetLink, setActiveResetLink] = useState<{
    collabId: string
    link: string
    nom: string
    telephone?: string | null
    identifiant?: string | null
  } | null>(null)
  const [copied, setCopied] = useState(false)
  const [directPassword, setDirectPassword] = useState('')
  const [showDirectPassword, setShowDirectPassword] = useState(false)
  const [directPasswordSuccess, setDirectPasswordSuccess] = useState<string | null>(null)
  const [directPasswordError, setDirectPasswordError] = useState<string | null>(null)
  const [copiedDirectAccess, setCopiedDirectAccess] = useState(false)

  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  function closeAddModal() {
    setShowAddModal(false)
    setErrorMsg(null)
    setAddRole('collaborateur')
    setAddRoleCustom('')
    setAddRestrictPerms(true)
    setAddCustomPerms(defaultPermissionsForRole('collaborateur') ?? readOnlyPermissions())
    setShowAddPassword(false)
  }

  function handleChangeAddRole(nextRole: string) {
    setAddRole(nextRole)
    if (nextRole === 'admin') {
      setAddRestrictPerms(false)
      setAddCustomPerms(fullPermissions())
    } else {
      setAddRestrictPerms(true)
      setAddCustomPerms(defaultPermissionsForRole(nextRole) ?? readOnlyPermissions())
    }
  }

  function handleChangeEditRole(nextRole: string) {
    setEditRole(nextRole)
    if (nextRole === 'admin') {
      setRestrictPerms(false)
      setCustomPerms(fullPermissions())
    } else {
      setRestrictPerms(true)
      setCustomPerms(defaultPermissionsForRole(nextRole) ?? readOnlyPermissions())
    }
  }

  // Fermeture des modales avec la touche Echap
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (showAddModal) closeAddModal()
        if (selectedCollabPerms) setSelectedCollabPerms(null)
        if (activeResetLink) setActiveResetLink(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showAddModal, selectedCollabPerms, activeResetLink])

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

    const rawIdent = (formData.get('identifiant') as string)?.trim() || ''
    const rawNom = (formData.get('nom_complet') as string)?.trim() || rawIdent
    const rawTel = (formData.get('telephone') as string)?.trim() || null
    const rawEmail = (formData.get('email') as string)?.trim() || null
    const rawRole = (formData.get('role') as string)?.trim() || 'collaborateur'
    const customRole = (formData.get('role_custom') as string)?.trim() || ''
    const finalRole = rawRole === 'autre' && customRole ? customRole : rawRole
    const rawPassword = (formData.get('password') as string) || ''

    setIsSubmittingAdd(true)
    try {
      const res = await creerCollaborateur(formData)
      if (res?.error) {
        setErrorMsg(res.error)
      } else if (res?.success && res.collaborateur) {
        // 1. Fermer immédiatement le formulaire modal
        setShowAddModal(false)

        // 2. Mettre à jour immédiatement la liste locale des collaborateurs
        const newCollab: CollaborateurItem = {
          id: res.collaborateur.id,
          identifiant: res.collaborateur.identifiant,
          nom_complet: res.collaborateur.nom_complet || rawNom,
          telephone: res.collaborateur.telephone || rawTel,
          role: res.collaborateur.role || finalRole,
          email: rawEmail || `${res.collaborateur.identifiant}@auth.dembasolution.internal`,
          permissions:
            res.collaborateur.permissions !== undefined
              ? res.collaborateur.permissions
              : addRestrictPerms
                ? addCustomPerms
                : defaultPermissionsForRole(finalRole),
        }
        setCollabList((prev) => [newCollab, ...prev.filter((c) => c.id !== newCollab.id)])

        // 3. Afficher la carte récapitulative des accès au-dessus du tableau
        setCreatedSuccessInfo({
          nom: res.collaborateur.nom_complet || rawNom,
          identifiant: res.collaborateur.identifiant,
          telephone: res.collaborateur.telephone || rawTel,
          email: rawEmail,
          role: res.collaborateur.role || finalRole,
          password: rawPassword,
        })
        setSuccessMsg(`Collaborateur "${res.collaborateur.nom_complet || rawNom}" créé avec succès !`)

        // 4. Réinitialiser les champs
        form.reset()
        setAddRole('collaborateur')
        setAddRoleCustom('')
        setAddRestrictPerms(true)
        setAddCustomPerms(defaultPermissionsForRole('collaborateur') ?? readOnlyPermissions())
        setShowAddPassword(false)

        // 5. Rafraîchir les données serveur
        router.refresh()
      }
    } catch (err: unknown) {
      console.error('Erreur handleAddCollaborateur:', err)
      const message = err instanceof Error ? err.message : 'Erreur lors de la création du compte.'
      setErrorMsg(message)
    } finally {
      setIsSubmittingAdd(false)
    }
  }

  // Suppression
  function handleDelete(collab: CollaborateurItem) {
    const nom = collab.nom_complet || collab.identifiant || 'ce collaborateur'
    if (!confirm(`Supprimer définitivement l'accès de ${nom} ?`)) return

    setErrorMsg(null)
    startTransition(async () => {
      // Suppression optimiste immédiate dans l'UI
      setCollabList((prev) => prev.filter((c) => c.id !== collab.id))
      const res = await supprimerCollaborateur(collab.id)
      if (res.error) {
        setErrorMsg(res.error)
        router.refresh()
      } else {
        setSuccessMsg(`Accès de ${nom} révoqué.`)
        router.refresh()
        setTimeout(() => setSuccessMsg(null), 3000)
      }
    })
  }

  // Génération du lien de récupération / ouverture modale mot de passe
  function handleGenerateResetLink(collab: CollaborateurItem) {
    setErrorMsg(null)
    setDirectPassword('')
    setShowDirectPassword(false)
    setDirectPasswordSuccess(null)
    setDirectPasswordError(null)
    setCopiedDirectAccess(false)
    startTransition(async () => {
      const res = await genererLienResetCollaborateur(collab.id)
      if (res.error) {
        // Même si la génération du lien échoue, on ouvre la modale pour permettre la modification directe du mot de passe
        setActiveResetLink({
          collabId: collab.id,
          link: '',
          nom: collab.nom_complet || collab.identifiant || 'Collaborateur',
          telephone: collab.telephone,
          identifiant: collab.identifiant,
        })
      } else {
        setActiveResetLink({
          collabId: collab.id,
          link: res.link || '',
          nom: collab.nom_complet || collab.identifiant || 'Collaborateur',
          telephone: res.telephone ?? collab.telephone,
          identifiant: res.identifiant ?? collab.identifiant,
        })
      }
    })
  }

  function handleSaveDirectPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!activeResetLink) return
    setDirectPasswordError(null)
    setDirectPasswordSuccess(null)
    const pwd = directPassword.trim()
    if (pwd.length < 6) {
      setDirectPasswordError('Le nouveau mot de passe doit contenir au moins 6 caractères.')
      return
    }
    startTransition(async () => {
      const res = await modifierMotDePasseCollaborateur(activeResetLink.collabId, pwd)
      if (res.error) {
        setDirectPasswordError(res.error)
      } else {
        setDirectPasswordSuccess('Le nouveau mot de passe a été enregistré et activé immédiatement !')
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
    const isStandard = ROLES_STANDARDS.some((r) => r.value === collab.role && r.value !== 'autre')
    if (isStandard && collab.role) {
      setEditRole(collab.role)
      setEditRoleCustom('')
    } else {
      setEditRole('autre')
      setEditRoleCustom(collab.role || '')
    }
    const isCollabAdmin = (collab.role || '').toLowerCase() === 'admin'
    setCustomPerms(
      collab.permissions ?? (isCollabAdmin ? fullPermissions() : (defaultPermissionsForRole(collab.role) ?? readOnlyPermissions()))
    )
    setRestrictPerms(collab.permissions !== null || !isCollabAdmin)
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
        setCollabList((prev) =>
          prev.map((c) =>
            c.id === selectedCollabPerms.id
              ? {
                ...c,
                role: finalRole,
                permissions: restrictPerms ? sanitizePermissions(customPerms) : null,
              }
              : c
          )
        )
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

      {/* Bannière de récapitulatif des accès après création réussie */}
      {createdSuccessInfo && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 space-y-3.5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2.5 text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Compte opérationnel pour {createdSuccessInfo.nom}</span>
            </div>
            <button
              type="button"
              onClick={() => setCreatedSuccessInfo(null)}
              aria-label="Masquer le récapitulatif"
              className="rounded-lg p-1 text-foreground-muted hover:bg-background hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
            <div className="rounded-lg bg-surface/90 p-2.5 border border-surface-border/50">
              <span className="text-foreground-muted block text-[11px] mb-0.5">Identifiant de connexion :</span>
              <code className="font-mono font-semibold text-primary text-sm select-all">
                {createdSuccessInfo.identifiant}
              </code>
            </div>

            <div className="rounded-lg bg-surface/90 p-2.5 border border-surface-border/50">
              <span className="text-foreground-muted block text-[11px] mb-0.5">Rôle attribué :</span>
              <span className={`inline-block rounded-md px-2 py-0.5 font-medium border text-[11px] ${getRoleBadge(createdSuccessInfo.role)}`}>
                {createdSuccessInfo.role}
              </span>
            </div>

            {createdSuccessInfo.telephone && (
              <div className="rounded-lg bg-surface/90 p-2.5 border border-surface-border/50">
                <span className="text-foreground-muted block text-[11px] mb-0.5">Téléphone :</span>
                <span className="font-mono text-foreground font-medium">
                  {createdSuccessInfo.telephone}
                </span>
              </div>
            )}

            {createdSuccessInfo.password && (
              <div className="rounded-lg bg-surface/90 p-2.5 border border-surface-border/50">
                <div className="flex items-center justify-between">
                  <span className="text-foreground-muted block text-[11px] mb-0.5">Mot de passe temporaire :</span>
                  <button
                    type="button"
                    onClick={() => setShowCreatedPassword(!showCreatedPassword)}
                    className="text-foreground-muted hover:text-foreground text-[10px] inline-flex items-center gap-1"
                  >
                    {showCreatedPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {showCreatedPassword ? 'Masquer' : 'Afficher'}
                  </button>
                </div>
                <code className="font-mono font-semibold text-foreground text-sm select-all">
                  {showCreatedPassword ? createdSuccessInfo.password : '••••••••'}
                </code>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-emerald-500/20">
            <button
              type="button"
              onClick={() => {
                const txt = `Vos identifiants d'accès SIGGIE :\n- Nom : ${createdSuccessInfo.nom}\n- Identifiant : ${createdSuccessInfo.identifiant}${createdSuccessInfo.telephone ? `\n- Téléphone : ${createdSuccessInfo.telephone}` : ''}\n- Mot de passe : ${createdSuccessInfo.password || '(défini par l\'administrateur)'}\n- Rôle : ${createdSuccessInfo.role}`
                navigator.clipboard.writeText(txt)
                setCopiedSuccess(true)
                setTimeout(() => setCopiedSuccess(false), 2000)
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface transition-colors"
            >
              {copiedSuccess ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedSuccess ? 'Identifiants copiés !' : 'Copier les accès'}
            </button>

            {createdSuccessInfo.telephone && (
              <a
                href={`https://wa.me/${createdSuccessInfo.telephone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                  `Bonjour ${createdSuccessInfo.nom}, votre compte d'accès SIGGIE est prêt.\n\nIdentifiant : ${createdSuccessInfo.identifiant}\nTéléphone : ${createdSuccessInfo.telephone}\nMot de passe : ${createdSuccessInfo.password || ''}\n\nVous pouvez vous connecter par votre identifiant, votre nom ou votre numéro de téléphone.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] text-white px-3 py-1.5 text-xs font-semibold hover:opacity-95 transition-opacity"
              >
                <MessageSquare className="h-3.5 w-3.5" /> Envoyer par WhatsApp
              </a>
            )}

            <button
              type="button"
              onClick={() => setCreatedSuccessInfo(null)}
              className="ml-auto rounded-md px-3 py-1.5 text-xs font-medium text-foreground-muted hover:text-foreground transition-colors"
            >
              Fermer cet encadré
            </button>
          </div>
        </div>
      )}

      {/* Note d'information */}
      <div className="rounded-xl border border-surface-border bg-surface/50 p-4 text-xs text-foreground-muted space-y-1">
        <p className="font-semibold text-foreground flex items-center gap-1.5">
          <Shield className="h-4 w-4 text-primary" /> Authentification simplifiée & sécurisée
        </p>
        <p>
          Vos collaborateurs peuvent se connecter avec leur <strong>identifiant</strong> (ex: <code className="font-mono text-primary">ugt-president</code>), leur <strong>nom complet</strong> (ex: <code className="font-mono text-primary">Lamine DIOP</code>) ou leur <strong>numéro de téléphone</strong> (ex: <code className="font-mono text-primary">78 356 05 78</code> ou <code className="font-mono text-primary">+221 78 356 05 78</code>). En cas d&apos;oubli de mot de passe, cliquez sur <strong>Réinitialiser</strong> pour définir directement un nouveau mot de passe ou envoyer un lien par WhatsApp.
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
            {collabList.map((collab) => {
              const isCurrentUser = collab.id === currentUserId
              const isSynthetic = collab.email?.endsWith('@auth.dembasolution.internal')
              const hasName = Boolean(collab.nom_complet && collab.nom_complet.trim())
              const titleName = hasName
                ? collab.nom_complet
                : (collab.identifiant && !collab.identifiant.includes('@')
                  ? collab.identifiant
                  : (collab.email && !isSynthetic ? collab.email.split('@')[0] : 'Collaborateur'))
              const roleDisplay = collab.role || 'collaborateur'

              return (
                <tr key={collab.id} className="hover:bg-background/40 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-foreground capitalize flex items-center gap-2">
                      <span>{titleName}</span>
                      {isCurrentUser && (
                        <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                          Vous
                        </span>
                      )}
                    </div>
                    {!isSynthetic && collab.email && (
                      <div className="text-xs text-foreground-muted">{collab.email}</div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs space-y-0.5">
                    {collab.identifiant && collab.identifiant !== collab.email && (
                      <div className="font-mono text-foreground font-semibold">@{collab.identifiant}</div>
                    )}
                    {collab.telephone ? (
                      <div className="text-foreground-muted font-mono flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span>{collab.telephone}</span>
                      </div>
                    ) : (
                      <div className="text-foreground-muted italic text-[11px]">Sans téléphone</div>
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
                      title="Modifier le mot de passe ou générer un lien de réinitialisation"
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
            {collabList.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-foreground-muted text-sm">
                  Aucun autre collaborateur enregistré.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal : Réinitialisation directe du mot de passe & Lien magique */}
      {activeResetLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setActiveResetLink(null)}
          />
          <div className="relative my-8 w-full max-w-lg rounded-xl border border-surface-border bg-surface p-6 shadow-xl space-y-5 z-10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold font-heading text-foreground">
                  Réinitialiser l&apos;accès de {activeResetLink.nom}
                </h3>
                <p className="text-xs text-foreground-muted mt-0.5">
                  Identifiant : <code className="font-mono text-primary font-semibold">{activeResetLink.identifiant || activeResetLink.nom}</code>
                  {activeResetLink.telephone ? ` • Tél : ${activeResetLink.telephone}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveResetLink(null)}
                aria-label="Fermer"
                className="rounded-lg p-1 text-foreground-muted hover:bg-background hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Option 1 : Définir directement un nouveau mot de passe */}
            <form onSubmit={handleSaveDirectPassword} className="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-3">
              <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5 text-primary" />
                <span>Option 1 (Recommandée) : Définir directement un nouveau mot de passe</span>
              </div>

              {directPasswordError && (
                <div className="rounded-lg bg-danger/10 border border-danger/20 p-2.5 text-xs text-danger flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{directPasswordError}</span>
                </div>
              )}

              {directPasswordSuccess && (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-700 dark:text-emerald-300 space-y-2">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{directPasswordSuccess}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const txt = `Vos accès SIGGIE mis à jour :\n- Nom : ${activeResetLink.nom}\n- Identifiant : ${activeResetLink.identifiant || activeResetLink.nom}${activeResetLink.telephone ? `\n- Téléphone : ${activeResetLink.telephone}` : ''}\n- Nouveau mot de passe : ${directPassword.trim()}`
                        navigator.clipboard.writeText(txt)
                        setCopiedDirectAccess(true)
                        setTimeout(() => setCopiedDirectAccess(false), 2000)
                      }}
                      className="inline-flex items-center gap-1.5 rounded-md border border-surface-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground hover:bg-background"
                    >
                      {copiedDirectAccess ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedDirectAccess ? 'Accès copiés !' : 'Copier les nouveaux accès'}
                    </button>
                    {activeResetLink.telephone && (
                      <a
                        href={`https://wa.me/${activeResetLink.telephone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                          `Bonjour ${activeResetLink.nom}, vos identifiants SIGGIE ont été mis à jour :\n- Identifiant : ${activeResetLink.identifiant || activeResetLink.nom}\n- Téléphone : ${activeResetLink.telephone}\n- Nouveau mot de passe : ${directPassword.trim()}`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md bg-[#25D366] text-white px-2.5 py-1 text-xs font-semibold hover:opacity-95"
                      >
                        <MessageSquare className="h-3.5 w-3.5" /> Envoyer par WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type={showDirectPassword ? 'text' : 'password'}
                    value={directPassword}
                    onChange={(e) => setDirectPassword(e.target.value)}
                    minLength={6}
                    placeholder="Nouveau mot de passe (min. 6 caractères)"
                    className="w-full rounded-md border border-surface-border bg-background px-3 py-2 pr-9 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDirectPassword(!showDirectPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-foreground-muted hover:text-foreground"
                  >
                    {showDirectPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={isPending || directPassword.trim().length < 6}
                  className="shrink-0 rounded-md bg-primary px-3.5 py-2 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
                >
                  {isPending ? 'Enregistrement...' : 'Activer'}
                </button>
              </div>
            </form>

            {/* Option 2 : Lien magique */}
            {activeResetLink.link && (
              <div className="space-y-2.5 pt-2 border-t border-surface-border">
                <p className="text-xs font-medium text-foreground-muted">
                  Option 2 : Ou transmettez ce lien de réinitialisation à <strong>{activeResetLink.nom}</strong> :
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
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Fond sombre cliquable pour fermer */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={closeAddModal}
          />

          <div className="relative my-8 w-full max-w-xl rounded-xl border border-surface-border bg-surface p-6 shadow-xl space-y-4 z-10">
            {/* En-tête avec bouton de fermeture croix */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold font-heading text-foreground">
                  Ajouter un collaborateur
                </h3>
                <p className="text-xs text-foreground-muted mt-0.5">
                  L&apos;adresse e-mail est facultative pour les collaborateurs. Seul l&apos;identifiant ou téléphone est requis.
                </p>
              </div>
              <button
                type="button"
                onClick={closeAddModal}
                aria-label="Fermer"
                className="rounded-lg p-1 text-foreground-muted hover:bg-background hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

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
                  placeholder="ex: amadou_ba ou lamine_diop ou 771234567"
                  className="w-full rounded-md border border-surface-border bg-background px-3 py-2 text-foreground text-sm font-mono focus:border-primary focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-foreground-muted">
                  Sera utilisé pour la connexion (le collaborateur pourra aussi se connecter avec son nom ou son téléphone).
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
                <div className="relative">
                  <input
                    name="password"
                    type={showAddPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Au moins 6 caractères"
                    className="w-full rounded-md border border-surface-border bg-background px-3 py-2 pr-10 text-foreground text-sm focus:border-primary focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPassword(!showAddPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-foreground-muted hover:text-foreground"
                  >
                    {showAddPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-foreground">
                  Rôle & Titre dans le GIE
                </label>
                <select
                  name="role"
                  value={addRole}
                  onChange={(e) => handleChangeAddRole(e.target.value)}
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
                      disabled={isSubmittingAdd}
                    />
                  </div>
                )}
              </div>

              {/* Message d'erreur visible en bas également pour éviter de devoir scroller */}
              {errorMsg && (
                <div className="rounded-lg bg-danger/10 border border-danger/20 p-3 text-xs text-danger flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-surface-border">
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="rounded-md border border-surface-border px-4 py-2 text-xs font-medium text-foreground hover:bg-background transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
                >
                  {isSubmittingAdd && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isSubmittingAdd ? 'Création en cours...' : 'Créer le collaborateur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal : Modification du rôle et des permissions */}
      {selectedCollabPerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedCollabPerms(null)}
          />
          <div className="relative my-8 w-full max-w-2xl rounded-xl border border-surface-border bg-surface p-6 shadow-xl space-y-4 z-10">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-lg font-bold font-heading text-foreground">
                Rôle et permissions de {selectedCollabPerms.nom_complet || selectedCollabPerms.identifiant}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedCollabPerms(null)}
                aria-label="Fermer"
                className="rounded-lg p-1 text-foreground-muted hover:bg-background hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modifier le rôle */}
            <div className="space-y-2 p-3 rounded-lg border border-surface-border bg-background/50">
              <label className="block text-xs font-semibold text-foreground">
                Rôle attribué dans le GIE
              </label>
              <select
                value={editRole}
                onChange={(e) => handleChangeEditRole(e.target.value)}
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
