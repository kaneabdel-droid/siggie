// Accès à l'espace /admin : une simple liste d'emails autorisés (un seul utilisateur
// concerné pour l'instant), pas de rôle dédié en base.
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const allowed = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return allowed.includes(email.toLowerCase())
}
