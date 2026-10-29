import type { SupabaseClient } from '@supabase/supabase-js'

export const DOMAINE_AUTH_INTERNE = 'auth.dembasolution.internal'

/**
 * Nettoie et normalise un identifiant ou un numéro de téléphone.
 * Retire un éventuel '@' initial (affiché dans l'UI sous la forme @identifiant)
 * et convertit les espaces en tirets bas pour former un identifiant valide.
 */
export function normaliserIdentifiant(input: string): string {
  return input
    .trim()
    .replace(/^@+/, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
}

/**
 * Normalise une chaîne (identifiant, nom complet, rôle) pour une comparaison souple :
 * sans accents, sans '@' initial, en minuscules, et en unifiant espaces, tirets et underscores.
 */
export function normaliserTexteComparaison(input?: string | null): string {
  if (!input) return ''
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/^@+/, '')
    .toLowerCase()
    .replace(/[\s_-]+/g, ' ')
    .trim()
}

/**
 * Extrait uniquement les chiffres d'un numéro de téléphone.
 */
export function extraireChiffresTelephone(input?: string | null): string {
  if (!input) return ''
  return input.replace(/\D/g, '')
}

function normaliserNumeroLocal(digits: string): string {
  let d = digits.replace(/^00/, '')
  if (d.startsWith('221') && d.length >= 12) {
    d = d.slice(3)
  }
  return d
}

/**
 * Compare deux numéros de téléphone indépendamment du formatage (espaces, tirets, indicatif +221 / 00221).
 */
export function telephonesCorrespondent(inputPhone?: string | null, dbPhone?: string | null): boolean {
  const d1 = extraireChiffresTelephone(inputPhone)
  const d2 = extraireChiffresTelephone(dbPhone)
  if (d1.length < 7 || d2.length < 7) return false
  if (d1 === d2) return true

  const local1 = normaliserNumeroLocal(d1)
  const local2 = normaliserNumeroLocal(d2)
  if (local1 === local2) return true

  if (local1.length >= 9 && local2.length >= 9 && local1.slice(-9) === local2.slice(-9)) {
    return true
  }
  if (local1.length >= 8 && local2.length >= 8 && local1.slice(-8) === local2.slice(-8)) {
    return true
  }
  return false
}

function nomsCorrespondent(inputNorm: string, dbNom?: string | null): boolean {
  const nomNorm = normaliserTexteComparaison(dbNom)
  if (!inputNorm || !nomNorm) return false
  if (inputNorm === nomNorm) return true

  // Vérifier l'inversion Prénom Nom <-> Nom Prénom
  const partsInput = inputNorm.split(' ').filter(Boolean)
  const partsNom = nomNorm.split(' ').filter(Boolean)
  if (partsInput.length >= 2 && partsInput.length === partsNom.length) {
    const sortedInput = [...partsInput].sort().join(' ')
    const sortedNom = [...partsNom].sort().join(' ')
    if (sortedInput === sortedNom) return true
  }
  return false
}

/**
 * Génère un e-mail synthétique sécurisé pour Supabase Auth à partir d'un identifiant ou téléphone.
 * Cet e-mail est purement technique et n'est jamais affiché aux utilisateurs finaux.
 */
export function genererEmailSynthetique(identifiantOuTelephone: string, gieId?: string): string {
  const clean = normaliserIdentifiant(identifiantOuTelephone).replace(/[^a-z0-9_.-]/g, '_')
  const suffix = gieId ? `.${gieId.slice(0, 8)}` : ''
  return `${clean}${suffix}@${DOMAINE_AUTH_INTERNE}`
}

/**
 * Détermine si une adresse e-mail est un alias synthétique interne.
 */
export function estEmailSynthetique(email?: string | null): boolean {
  if (!email) return false
  return email.toLowerCase().endsWith(`@${DOMAINE_AUTH_INTERNE}`)
}

export type CandidatUtilisateur = {
  id: string
  gie_id: string | null
  identifiant: string | null
  telephone: string | null
  nom_complet: string | null
  role: string | null
  score: number
}

/**
 * Recherche tous les profils utilisateurs correspondant à la saisie
 * (par identifiant avec ou sans '@', numéro de téléphone avec ou sans indicatif/espaces,
 * nom complet, ou rôle), triés par pertinence décroissante.
 */
export async function resoudreUtilisateursCandidats(
  identifiantOuEmail: string,
  supabaseAdmin: SupabaseClient
): Promise<CandidatUtilisateur[]> {
  const rawInput = identifiantOuEmail.trim()
  const sansArobase = rawInput.replace(/^@+/, '').trim()
  const cleanIdent = normaliserIdentifiant(sansArobase)
  const normTexte = normaliserTexteComparaison(sansArobase)
  const inputDigits = extraireChiffresTelephone(sansArobase)

  const { data: rows } = await supabaseAdmin
    .from('utilisateurs')
    .select('id, gie_id, identifiant, telephone, nom_complet, role')

  const candidats: CandidatUtilisateur[] = []

  for (const row of rows ?? []) {
    let score = 0
    const rowIdentClean = row.identifiant ? normaliserIdentifiant(row.identifiant) : ''
    const rowIdentNorm = normaliserTexteComparaison(row.identifiant)
    const rowRoleNorm = normaliserTexteComparaison(row.role)

    // 1. Correspondance exacte sur l'identifiant (ex: ugt-president, @ugt-president, ugt_president)
    if (rowIdentClean && (rowIdentClean === cleanIdent || rowIdentNorm === normTexte)) {
      score = Math.max(score, 100)
    }

    // 2. Correspondance sur le numéro de téléphone (avec ou sans +221, avec ou sans espaces)
    if (inputDigits.length >= 7 && telephonesCorrespondent(sansArobase, row.telephone)) {
      score = Math.max(score, 95)
    }

    // 3. Correspondance exacte sur le nom complet (ex: "Lamine DIOP" ou "DIOP Lamine")
    if (normTexte.length >= 3 && nomsCorrespondent(normTexte, row.nom_complet)) {
      score = Math.max(score, 90)
    }

    // 4. Correspondance partielle sur l'identifiant (ex: saisie "president" pour "ugt-president")
    if (
      score === 0 &&
      normTexte.length >= 3 &&
      rowIdentNorm &&
      (rowIdentNorm.endsWith(` ${normTexte}`) || rowIdentNorm.startsWith(`${normTexte} `))
    ) {
      score = Math.max(score, 65)
    }

    // 5. Correspondance sur le rôle (ex: "president", "tresorier", "magasinier")
    if (score === 0 && normTexte.length >= 3 && rowRoleNorm && rowRoleNorm === normTexte) {
      score = Math.max(score, 50)
    }

    if (score > 0) {
      candidats.push({
        id: row.id,
        gie_id: row.gie_id ?? null,
        identifiant: row.identifiant ?? null,
        telephone: row.telephone ?? null,
        nom_complet: row.nom_complet ?? null,
        role: row.role ?? null,
        score,
      })
    }
  }

  candidats.sort((a, b) => b.score - a.score)
  return candidats
}

/**
 * Résout une saisie (identifiant, nom complet, téléphone ou e-mail) vers la liste
 * ordonnée des adresses e-mail Supabase Auth candidates.
 * Permet d'essayer successivement plusieurs comptes en cas d'homonymie entre GIEs.
 */
export async function resoudreEmailsCandidats(
  identifiantOuEmail: string,
  supabaseAdmin: SupabaseClient
): Promise<string[]> {
  const rawInput = identifiantOuEmail.trim()
  if (!rawInput) return []

  const emails: string[] = []
  const addEmail = (em?: string | null) => {
    if (!em) return
    const lower = em.trim().toLowerCase()
    if (lower && !emails.includes(lower)) {
      emails.push(lower)
    }
  }

  // 1. E-mail réel classique (contient '@' ailleurs qu'en première position et hors domaine interne)
  if (rawInput.includes('@') && !rawInput.startsWith('@') && !estEmailSynthetique(rawInput)) {
    addEmail(rawInput)
    return emails
  }

  const sansArobase = rawInput.replace(/^@+/, '').trim()
  if (estEmailSynthetique(sansArobase)) {
    addEmail(sansArobase)
  }

  const cleanIdent = normaliserIdentifiant(sansArobase)
  const normTexte = normaliserTexteComparaison(sansArobase)
  const inputDigits = extraireChiffresTelephone(sansArobase)

  // 2. Recherche dans public.utilisateurs
  const candidats = await resoudreUtilisateursCandidats(rawInput, supabaseAdmin)

  for (const cand of candidats) {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(cand.id)
    if (authUser?.user?.email) {
      addEmail(authUser.user.email)
    }
  }

  // 3. Recherche complémentaire dans auth.users (user_metadata + prefixe e-mail synthétique)
  // Utile si un profil public.utilisateurs n'avait pas toutes les métadonnées renseignées
  if (emails.length === 0) {
    const { data: authList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
    for (const u of authList?.users ?? []) {
      const meta = (u.user_metadata || {}) as Record<string, any>
      const metaIdentNorm = normaliserTexteComparaison(meta.identifiant)
      const metaNomNorm = normaliserTexteComparaison(meta.nom_complet)
      const metaTel = meta.telephone as string | undefined
      const emailLocal = u.email?.toLowerCase().split('@')[0] || ''
      const emailBase = emailLocal.split('.')[0] || ''

      const matchIdent =
        (metaIdentNorm && metaIdentNorm === normTexte) ||
        (cleanIdent && (emailLocal === cleanIdent || emailBase === cleanIdent))
      const matchTel = inputDigits.length >= 7 && telephonesCorrespondent(sansArobase, metaTel)
      const matchNom = normTexte.length >= 3 && nomsCorrespondent(normTexte, meta.nom_complet || metaNomNorm)

      if (matchIdent || matchTel || matchNom) {
        addEmail(u.email)
      }
    }
  }

  // 4. Fallback synthétique par défaut
  addEmail(genererEmailSynthetique(cleanIdent))

  return emails
}

/**
 * Résout une chaîne de connexion saisie (e-mail réel, pseudo/identifiant, nom ou téléphone)
 * vers l'adresse e-mail auth principale correspondante dans Supabase.
 */
export async function resoudreAuthEmail(
  identifiantOuEmail: string,
  supabaseAdmin: SupabaseClient
): Promise<{ email: string; isSynthetic: boolean; userId?: string }> {
  const rawInput = identifiantOuEmail.trim()

  if (rawInput.includes('@') && !rawInput.startsWith('@') && !estEmailSynthetique(rawInput)) {
    return {
      email: rawInput.toLowerCase(),
      isSynthetic: false,
    }
  }

  const candidats = await resoudreUtilisateursCandidats(rawInput, supabaseAdmin)
  for (const cand of candidats) {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(cand.id)
    if (authUser?.user?.email) {
      return {
        email: authUser.user.email,
        isSynthetic: estEmailSynthetique(authUser.user.email),
        userId: cand.id,
      }
    }
  }

  const emails = await resoudreEmailsCandidats(rawInput, supabaseAdmin)
  const bestEmail = emails[0] || genererEmailSynthetique(normaliserIdentifiant(rawInput))

  return {
    email: bestEmail,
    isSynthetic: estEmailSynthetique(bestEmail),
  }
}
