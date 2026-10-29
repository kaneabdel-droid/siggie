// Catalogue des pages/modules SIGGIE et des actions qu'on peut autoriser sur chacun.
// Partagé entre l'UI de gestion des droits (admin), le middleware (accès aux pages),
// la barre latérale et les server actions.

export type PermissionAction = 'read' | 'create' | 'update' | 'delete'
export type PermissionMap = Record<string, PermissionAction[]>

export const PERMISSION_ACTION_LABELS: Record<PermissionAction, string> = {
  read: 'Lecture',
  create: 'Création',
  update: 'Modification',
  delete: 'Suppression',
}

export const ALL_ACTIONS: PermissionAction[] = ['read', 'create', 'update', 'delete']
const CRUD = ALL_ACTIONS

export type PermissionModule = {
  key: string
  label: string
  group: string
  // Préfixes d'URL couverts ; le préfixe le plus long l'emporte.
  paths: string[]
  actions: PermissionAction[]
  // Précision affichée sous le libellé (ce que recouvre "modification", etc.)
  hint?: string
}

export const PERMISSION_MODULES: PermissionModule[] = [
  { key: 'dashboard', label: 'Tableau de bord', group: 'Général', paths: ['/dashboard'], actions: ['read'] },
  { key: 'membres', label: 'Membres', group: 'Gestion', paths: ['/membres'], actions: CRUD },
  { key: 'campagnes', label: 'Campagnes & Superficies', group: 'Gestion', paths: ['/campagnes', '/superficies'], actions: CRUD, hint: 'Modification : inclut la configuration (membres, intrants, budget) et le tour de casier (superficies)' },
  { key: 'intrants', label: 'Intrants & Stock', group: 'Gestion', paths: ['/intrants'], actions: CRUD, hint: 'Création : inclut les achats de stock' },
  { key: 'distribution', label: 'Distribution', group: 'Gestion', paths: ['/distribution'], actions: CRUD },
  { key: 'credits', label: 'Crédits bancaires', group: 'Finance', paths: ['/credits'], actions: CRUD, hint: 'Modification : statut, décaissements, remboursements' },
  { key: 'facturation', label: 'Facturation', group: 'Finance', paths: ['/facturation'], actions: ['read', 'create', 'update'], hint: 'Création : générer les factures · Modification : calcul des intérêts' },
  { key: 'remboursements', label: 'Remboursements', group: 'Finance', paths: ['/remboursements'], actions: ['read', 'create'], hint: 'Création : enregistrer un paiement' },
  { key: 'ristournes', label: 'Ristournes (surplus rendu aux membres)', group: 'Finance', paths: ['/remboursements/ristournes'], actions: ['read', 'create', 'delete'], hint: 'Création : sortie de trésorerie au profit du membre' },
  { key: 'stock_nature', label: 'Stock en nature', group: 'Finance', paths: ['/remboursements/stock-nature'], actions: ['read', 'create'] },
  { key: 'tresorerie', label: 'Trésorerie (comptes, journaux, rapprochement)', group: 'Finance', paths: ['/tresorerie'], actions: CRUD },
  { key: 'imputations', label: 'Imputations', group: 'Finance', paths: ['/tresorerie/imputations'], actions: CRUD },
  { key: 'materiel', label: 'Matériel (inventaire)', group: 'Matériel', paths: ['/materiel'], actions: CRUD },
  { key: 'materiel_prestations', label: 'Prestations matériel', group: 'Matériel', paths: ['/materiel/prestations'], actions: CRUD },
  { key: 'materiel_consommations', label: 'Consommations matériel', group: 'Matériel', paths: ['/materiel/consommations'], actions: CRUD },
  { key: 'materiel_analyses', label: 'Amortissements & rentabilité', group: 'Matériel', paths: ['/materiel/amortissements', '/materiel/rentabilite'], actions: ['read'] },
  { key: 'bilans', label: 'Bilans, relevés membres & suivi budgétaire', group: 'Bilans', paths: ['/bilans'], actions: ['read'] },
  { key: 'bilan_annuel', label: 'Bilan annuel & compte de résultat', group: 'Bilans', paths: ['/bilans/bilan-annuel'], actions: ['read', 'update'], hint: 'Modification : saisie des montants manuels (subventions, emprunts, autres produits/charges)' },
  { key: 'bilans_clients', label: 'Relevés clients externes', group: 'Bilans', paths: ['/bilans/releve-client'], actions: ['read', 'create'] },
  { key: 'parametres', label: 'Paramètres du GIE', group: 'Administration', paths: ['/parametres'], actions: ['read', 'update'] },
]

// Route -> module (préfixe le plus long). null = page non soumise aux droits
// (abonnement, support, etc. restent toujours accessibles).
const PATH_TO_MODULE: [string, string][] = PERMISSION_MODULES.flatMap((m) =>
  m.paths.map((p) => [p, m.key] as [string, string])
).sort((a, b) => b[0].length - a[0].length)

export function moduleForPath(pathname: string): string | null {
  for (const [prefix, key] of PATH_TO_MODULE) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) return key
  }
  return null
}

// Élimine les modules/actions inconnus avant stockage ; "create/update/delete"
// n'a de sens qu'avec "read" (on ne modifie pas ce qu'on ne peut pas voir).
export function sanitizePermissions(input: unknown): PermissionMap {
  const out: PermissionMap = {}
  if (!input || typeof input !== 'object') return out
  for (const m of PERMISSION_MODULES) {
    const raw = (input as Record<string, unknown>)[m.key]
    if (!Array.isArray(raw)) continue
    const actions = m.actions.filter((a) => raw.includes(a))
    if (actions.length === 0) continue
    if (!actions.includes('read') && m.actions.includes('read')) actions.unshift('read')
    out[m.key] = actions
  }
  return out
}

export function fullPermissions(): PermissionMap {
  return Object.fromEntries(PERMISSION_MODULES.map((m) => [m.key, [...m.actions]]))
}

export function readOnlyPermissions(): PermissionMap {
  return Object.fromEntries(
    PERMISSION_MODULES.filter((m) => m.key !== 'parametres').map((m) => [m.key, ['read' as PermissionAction]])
  )
}

/**
 * Retourne la matrice de permissions par défaut adaptée au rôle sélectionné.
 * Seul le rôle 'admin' retourne `null` (accès complet sans restriction).
 * Tous les autres rôles reçoivent automatiquement des droits restreints adaptés à leur fonction.
 */
export function defaultPermissionsForRole(role?: string | null): PermissionMap | null {
  const r = (role || 'collaborateur').trim().toLowerCase()
  if (r === 'admin') {
    return null
  }

  // Président : supervision complète en lecture seule sur tous les modules métiers
  if (r === 'president') {
    return readOnlyPermissions()
  }

  // Trésorier / Comptable : gestion financière, trésorerie, remboursements, facturation et bilans
  if (r === 'tresorier' || r === 'comptable') {
    return sanitizePermissions({
      dashboard: ['read'],
      membres: ['read'],
      campagnes: ['read'],
      intrants: ['read'],
      distribution: ['read'],
      credits: ['read', 'create', 'update'],
      facturation: ['read', 'create', 'update'],
      remboursements: ['read', 'create'],
      ristournes: ['read', 'create'],
      stock_nature: ['read'],
      tresorerie: ['read', 'create', 'update'],
      imputations: ['read', 'create', 'update'],
      materiel: ['read'],
      materiel_prestations: ['read'],
      materiel_consommations: ['read'],
      materiel_analyses: ['read'],
      bilans: ['read'],
      bilan_annuel: ['read', 'update'],
      bilans_clients: ['read', 'create'],
    })
  }

  // Magasinier : gestion des stocks d'intrants, distributions, stock en nature et matériel
  if (r === 'magasinier') {
    return sanitizePermissions({
      dashboard: ['read'],
      membres: ['read'],
      campagnes: ['read'],
      intrants: ['read', 'create', 'update'],
      distribution: ['read', 'create', 'update'],
      stock_nature: ['read', 'create'],
      remboursements: ['read'],
      materiel: ['read', 'create', 'update'],
      materiel_prestations: ['read', 'create', 'update'],
      materiel_consommations: ['read', 'create', 'update'],
      materiel_analyses: ['read'],
      bilans: ['read'],
    })
  }

  // Gestionnaire de campagne : gestion membres, campagnes, superficies, intrants, distributions, prestations
  if (r === 'gestionnaire') {
    return sanitizePermissions({
      dashboard: ['read'],
      membres: ['read', 'create', 'update'],
      campagnes: ['read', 'create', 'update'],
      intrants: ['read', 'create', 'update'],
      distribution: ['read', 'create', 'update'],
      credits: ['read'],
      facturation: ['read', 'create', 'update'],
      remboursements: ['read', 'create'],
      stock_nature: ['read', 'create'],
      materiel: ['read'],
      materiel_prestations: ['read', 'create', 'update'],
      materiel_consommations: ['read', 'create', 'update'],
      materiel_analyses: ['read'],
      bilans: ['read'],
      bilan_annuel: ['read'],
      bilans_clients: ['read', 'create'],
    })
  }

  // Secrétaire général / Opérateur : gestion administrative des membres, campagnes, distributions et facturation
  if (r === 'secretaire') {
    return sanitizePermissions({
      dashboard: ['read'],
      membres: ['read', 'create', 'update'],
      campagnes: ['read', 'create', 'update'],
      intrants: ['read'],
      distribution: ['read', 'create', 'update'],
      credits: ['read'],
      facturation: ['read', 'create', 'update'],
      remboursements: ['read'],
      tresorerie: ['read'],
      materiel: ['read'],
      materiel_prestations: ['read', 'create'],
      bilans: ['read'],
      bilans_clients: ['read', 'create'],
    })
  }

  // Collaborateur standard / Employé / Autre rôle : lecture seule par défaut
  return readOnlyPermissions()
}

// Un compte "admin" du GIE a toujours tout.
// Pour tout autre rôle, si `permissions` est null/absent en base, on applique les permissions par défaut du rôle.
export function hasPermission(
  role: string | null | undefined,
  permissions: PermissionMap | null | undefined,
  moduleKey: string,
  action: PermissionAction
): boolean {
  if (role === 'admin') return true
  const effectivePermissions = permissions ?? defaultPermissionsForRole(role)
  if (!effectivePermissions) return true
  return effectivePermissions[moduleKey]?.includes(action) ?? false
}

// Première page accessible : destination de repli quand l'accès est refusé.
const FIRST_PAGE_ORDER: [string, string][] = [
  ['dashboard', '/dashboard'], ['membres', '/membres'], ['campagnes', '/campagnes'],
  ['intrants', '/intrants'], ['distribution', '/distribution'], ['credits', '/credits'],
  ['facturation', '/facturation'], ['remboursements', '/remboursements'],
  ['tresorerie', '/tresorerie'], ['materiel', '/materiel'], ['bilans', '/bilans'],
  ['parametres', '/parametres'],
]

export function firstAllowedPath(role: string | null | undefined, permissions: PermissionMap | null | undefined): string {
  for (const [key, path] of FIRST_PAGE_ORDER) {
    if (hasPermission(role, permissions, key, 'read')) return path
  }
  return '/support'
}
