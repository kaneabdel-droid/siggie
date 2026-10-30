'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/utils/supabase/permissions'

export interface FournisseurSummary {
  id: string
  nom: string
  telephone: string | null
  adresse?: string | null
  code_fournisseur: string
  total_dette: number
  total_regle: number
  solde_actuel: number
}

export interface MouvementFournisseur {
  id: string
  date: string
  type: 'dette' | 'reglement'
  nature: 'achat_intrant' | 'consommation_materiel' | 'acquisition_materiel' | 'reglement_tresorerie' | 'autre'
  designation: string
  quantite: number | null
  unite?: string | null
  prix_unitaire: number | null
  montant: number
  debit: number // Dette (+)
  credit: number // Règlement (-)
  solde: number // Solde progressif restant dû
  piece_ref?: string | null
  compte_nom?: string | null
  raw?: any
}

export async function getFournisseurs(): Promise<{ fournisseurs?: FournisseurSummary[]; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non authentifié" }

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('gie_id')
    .eq('id', user.id)
    .single()

  if (!userData) return { error: "Utilisateur introuvable" }

  // 1. Essayer de charger la table fournisseurs_externes si elle existe
  let tableFournisseurs: any[] = []
  const tableRes = await supabase
    .from('fournisseurs_externes')
    .select('id, nom, telephone, adresse, code_fournisseur, solde_initial')
    .eq('gie_id', userData.gie_id)
    .order('nom', { ascending: true })

  if (!tableRes.error && tableRes.data) {
    tableFournisseurs = tableRes.data
  }

  // 2. Découvrir dynamiquement tous les fournisseurs mentionnés dans les achats, consommations et règlements
  const [achatsRes, consommationsRes, materielsRes, transactionsRes] = await Promise.all([
    supabase
      .from('achats_intrants')
      .select('fournisseur, montant_total')
      .eq('gie_id', userData.gie_id),
    supabase
      .from('materiel_consommations')
      .select('fournisseur, montant_total')
      .eq('gie_id', userData.gie_id),
    supabase
      .from('materiels')
      .select('fournisseur, valeur_acquisition')
      .eq('gie_id', userData.gie_id),
    supabase
      .from('transactions')
      .select('motif, montant, type_transaction, type_piece')
      .eq('gie_id', userData.gie_id),
  ])

  // Déduplication insensible à la casse
  const fournisseursMap = new Map<string, {
    id: string
    nom: string
    telephone: string | null
    adresse: string | null
    code_fournisseur: string
    total_dette: number
    total_regle: number
  }>()

  // Initialiser avec la table si présente
  tableFournisseurs.forEach((f, idx) => {
    const key = f.nom.trim().toLowerCase()
    fournisseursMap.set(key, {
      id: f.id,
      nom: f.nom.trim(),
      telephone: f.telephone || null,
      adresse: f.adresse || null,
      code_fournisseur: f.code_fournisseur || `FRN-${String(idx + 1).padStart(3, '0')}`,
      total_dette: Number(f.solde_initial || 0),
      total_regle: 0,
    })
  })

  // Agréger les achats d'intrants (dettes)
  for (const a of achatsRes.data || []) {
    const nom = String(a.fournisseur || '').trim()
    if (!nom || nom === '-') continue
    const key = nom.toLowerCase()
    if (!fournisseursMap.has(key)) {
      fournisseursMap.set(key, {
        id: `fournisseur-${encodeURIComponent(key)}`,
        nom,
        telephone: null,
        adresse: null,
        code_fournisseur: `FRN-${String(fournisseursMap.size + 1).padStart(3, '0')}`,
        total_dette: 0,
        total_regle: 0,
      })
    }
    const item = fournisseursMap.get(key)!
    item.total_dette += Number(a.montant_total || 0)
  }

  // Agréger les consommations matériel (dettes)
  for (const c of consommationsRes.data || []) {
    const nom = String(c.fournisseur || '').trim()
    if (!nom || nom === '-') continue
    const key = nom.toLowerCase()
    if (!fournisseursMap.has(key)) {
      fournisseursMap.set(key, {
        id: `fournisseur-${encodeURIComponent(key)}`,
        nom,
        telephone: null,
        adresse: null,
        code_fournisseur: `FRN-${String(fournisseursMap.size + 1).padStart(3, '0')}`,
        total_dette: 0,
        total_regle: 0,
      })
    }
    const item = fournisseursMap.get(key)!
    item.total_dette += Number(c.montant_total || 0)
  }

  // Agréger les acquisitions de matériel (dettes)
  for (const m of materielsRes.data || []) {
    const nom = String(m.fournisseur || '').trim()
    if (!nom || nom === '-') continue
    const key = nom.toLowerCase()
    if (!fournisseursMap.has(key)) {
      fournisseursMap.set(key, {
        id: `fournisseur-${encodeURIComponent(key)}`,
        nom,
        telephone: null,
        adresse: null,
        code_fournisseur: `FRN-${String(fournisseursMap.size + 1).padStart(3, '0')}`,
        total_dette: 0,
        total_regle: 0,
      })
    }
    const item = fournisseursMap.get(key)!
    item.total_dette += Number(m.valeur_acquisition || 0)
  }

  // Agréger les règlements trésorerie (sorties) vers ces fournisseurs
  for (const tx of transactionsRes.data || []) {
    if (tx.type_transaction !== 'sortie') continue
    const motifStr = String(tx.motif || '')
    const motifLower = motifStr.toLowerCase()

    // Vérifier si un des fournisseurs est mentionné dans le motif ou le tag [TIERS:nom]
    for (const [key, item] of fournisseursMap.entries()) {
      const matchTiers = motifLower.includes(`[tiers:${key}]`) || motifLower.includes(`tiers:${key}`)
      const matchName = motifLower.includes(key)
      const isFournisseurPiece = tx.type_piece === 'facture_fournisseur' || tx.type_piece === 'reglement_fournisseur'

      if (matchTiers || (matchName && (isFournisseurPiece || motifLower.includes('fournisseur') || motifLower.includes('achat') || motifLower.includes('règlement') || motifLower.includes('paiement')))) {
        item.total_regle += Number(tx.montant || 0)
        break
      }
    }
  }

  const fournisseurs: FournisseurSummary[] = Array.from(fournisseursMap.values()).map((f) => ({
    ...f,
    solde_actuel: Math.max(0, f.total_dette - f.total_regle),
  }))

  fournisseurs.sort((a, b) => a.nom.localeCompare(b.nom))

  return { fournisseurs }
}

export async function addFournisseur(nom: string, telephone?: string, adresse?: string) {
  const denied = await requirePermission('tresorerie', 'create')
  if (denied) return denied as never
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non authentifié" }

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('gie_id')
    .eq('id', user.id)
    .single()

  if (!userData) return { error: "Utilisateur introuvable" }
  if (!nom.trim()) return { error: "Le nom du fournisseur est obligatoire." }

  // Générer un code fournisseur
  const { data: countData } = await supabase
    .from('fournisseurs_externes')
    .select('id', { count: 'exact', head: true })
    .eq('gie_id', userData.gie_id)

  const nextNum = (countData ? Number(countData) : 0) + 1
  const codeFournisseur = `FRN-${String(nextNum).padStart(3, '0')}`

  const { data: inserted, error } = await supabase
    .from('fournisseurs_externes')
    .insert({
      gie_id: userData.gie_id,
      nom: nom.trim(),
      telephone: telephone?.trim() || null,
      adresse: adresse?.trim() || null,
      code_fournisseur: codeFournisseur,
    })
    .select('id, nom, telephone, adresse, code_fournisseur')
    .single()

  if (error) {
    // Si la table n'existe pas encore dans le cache, retourner un objet avec identifiant virtuel propre
    const virtualSupplier = {
      id: `fournisseur-${encodeURIComponent(nom.trim().toLowerCase())}`,
      nom: nom.trim(),
      telephone: telephone?.trim() || null,
      adresse: adresse?.trim() || null,
      code_fournisseur: codeFournisseur,
      total_dette: 0,
      total_regle: 0,
      solde_actuel: 0,
    }
    revalidatePath('/bilans/releve-fournisseur')
    return { success: true, fournisseur: virtualSupplier }
  }

  const fournisseur = {
    ...inserted,
    total_dette: 0,
    total_regle: 0,
    solde_actuel: 0,
  }

  revalidatePath('/bilans/releve-fournisseur')
  return { success: true, fournisseur }
}

export async function getReleveFournisseur(fournisseurNomOrId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non authentifié" }

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('gie_id')
    .eq('id', user.id)
    .single()

  if (!userData) return { error: "Utilisateur introuvable" }

  // Résoudre le nom propre du fournisseur
  let targetNom = fournisseurNomOrId.trim()
  let telephone: string | null = null
  let adresse: string | null = null
  let codeFournisseur = 'FRN-001'

  // Vérifier si c'est un UUID dans fournisseurs_externes
  const { data: fExt } = await supabase
    .from('fournisseurs_externes')
    .select('id, nom, telephone, adresse, code_fournisseur')
    .or(`id.eq.${fournisseurNomOrId},nom.ilike.${fournisseurNomOrId}`)
    .maybeSingle()

  if (fExt) {
    targetNom = fExt.nom
    telephone = fExt.telephone || null
    adresse = fExt.adresse || null
    codeFournisseur = fExt.code_fournisseur || 'FRN-001'
  } else if (targetNom.startsWith('fournisseur-')) {
    targetNom = decodeURIComponent(targetNom.replace('fournisseur-', ''))
  }

  const targetNomLower = targetNom.toLowerCase()

  // 1. Récupérer toutes les factures / dettes du fournisseur
  const [achatsRes, consommationsRes, materielsRes, transactionsRes, comptesRes] = await Promise.all([
    supabase
      .from('achats_intrants')
      .select('*, intrant:intrant_id(nom, unite_mesure)')
      .eq('gie_id', userData.gie_id)
      .order('date_achat', { ascending: true }),
    supabase
      .from('materiel_consommations')
      .select('*, materiel:materiel_id(nom)')
      .eq('gie_id', userData.gie_id)
      .order('date_consommation', { ascending: true }),
    supabase
      .from('materiels')
      .select('id, nom, fournisseur, valeur_acquisition, date_acquisition')
      .eq('gie_id', userData.gie_id),
    supabase
      .from('transactions')
      .select('id, montant, date_transaction, motif, type_piece, type_transaction, compte_id, reference_piece')
      .eq('gie_id', userData.gie_id)
      .eq('type_transaction', 'sortie')
      .order('date_transaction', { ascending: true }),
    supabase
      .from('comptes')
      .select('id, nom, type_compte')
      .eq('gie_id', userData.gie_id),
  ])

  const comptesMap = new Map<string, string>()
  for (const cp of comptesRes.data || []) {
    comptesMap.set(cp.id, cp.nom)
  }

  const mouvements: MouvementFournisseur[] = []

  // A. Achats d'intrants (Dettes)
  for (const a of achatsRes.data || []) {
    const fName = String(a.fournisseur || '').trim().toLowerCase()
    if (fName !== targetNomLower) continue

    const intrantNom = a.intrant?.nom || 'Intrant'
    const unite = a.intrant?.unite_mesure || 'unité'
    const refFacture = a.numero_facture ? ` (Facture N° ${a.numero_facture})` : ''
    const montant = Number(a.montant_total || (Number(a.quantite || 0) * Number(a.prix_unitaire || 0)) || 0)

    mouvements.push({
      id: `achat-${a.id}`,
      date: a.date_achat || new Date().toISOString().slice(0, 10),
      type: 'dette',
      nature: 'achat_intrant',
      designation: `Achat intrant : ${a.quantite || ''} ${unite} de ${intrantNom}${refFacture}`,
      quantite: a.quantite ? Number(a.quantite) : null,
      unite,
      prix_unitaire: a.prix_unitaire ? Number(a.prix_unitaire) : null,
      montant,
      debit: montant,
      credit: 0,
      solde: 0,
      piece_ref: a.numero_facture || null,
      compte_nom: null,
      raw: a,
    })
  }

  // B. Consommations Matériel (Dettes)
  for (const c of consommationsRes.data || []) {
    const fName = String(c.fournisseur || '').trim().toLowerCase()
    if (fName !== targetNomLower) continue

    const matNom = c.materiel?.nom ? ` (${c.materiel.nom})` : ''
    const refFacture = c.numero_facture ? ` - N° ${c.numero_facture}` : ''
    const montant = Number(c.montant_total || 0)

    mouvements.push({
      id: `consommation-${c.id}`,
      date: c.date_consommation || new Date().toISOString().slice(0, 10),
      type: 'dette',
      nature: 'consommation_materiel',
      designation: `Dépense matériel : ${c.type_consommation || 'Consommable'}${matNom}${refFacture}`,
      quantite: c.quantite ? Number(c.quantite) : null,
      unite: c.unite || null,
      prix_unitaire: c.prix_unitaire ? Number(c.prix_unitaire) : null,
      montant,
      debit: montant,
      credit: 0,
      solde: 0,
      piece_ref: c.numero_facture || null,
      compte_nom: null,
      raw: c,
    })
  }

  // C. Acquisitions Matériel (Dettes)
  for (const m of materielsRes.data || []) {
    const fName = String(m.fournisseur || '').trim().toLowerCase()
    if (fName !== targetNomLower) continue

    const montant = Number(m.valeur_acquisition || 0)
    if (montant <= 0) continue

    mouvements.push({
      id: `materiel-${m.id}`,
      date: m.date_acquisition || new Date().toISOString().slice(0, 10),
      type: 'dette',
      nature: 'acquisition_materiel',
      designation: `Acquisition équipement : ${m.nom}`,
      quantite: 1,
      unite: 'matériel',
      prix_unitaire: montant,
      montant,
      debit: montant,
      credit: 0,
      solde: 0,
      piece_ref: null,
      compte_nom: null,
      raw: m,
    })
  }

  // D. Règlements de trésorerie (Sorties de caisse / banque)
  for (const tx of transactionsRes.data || []) {
    const motifStr = String(tx.motif || '')
    const motifLower = motifStr.toLowerCase()

    const matchTiers = motifLower.includes(`[tiers:${targetNomLower}]`) || motifLower.includes(`tiers:${targetNomLower}`)
    const matchName = motifLower.includes(targetNomLower)
    const isFournisseurPiece = tx.type_piece === 'facture_fournisseur' || tx.type_piece === 'reglement_fournisseur'

    if (!matchTiers && !(matchName && (isFournisseurPiece || motifLower.includes('fournisseur') || motifLower.includes('achat') || motifLower.includes('règlement') || motifLower.includes('paiement')))) {
      continue
    }

    const cleanMotif = motifStr.replace(/\[[^\]]*\]/g, '').trim()
    const compteNom = tx.compte_id ? (comptesMap.get(tx.compte_id) || 'Compte') : 'Caisse / Banque'
    const montant = Number(tx.montant || 0)

    // Extraire numéro de référence ou de pièce si présent
    const refMatch = motifStr.match(/\[REF:([^\]]+)\]/)
    const pieceRef = refMatch ? refMatch[1].trim() : (tx.reference_piece || null)

    mouvements.push({
      id: `tx-${tx.id}`,
      date: tx.date_transaction || new Date().toISOString().slice(0, 10),
      type: 'reglement',
      nature: 'reglement_tresorerie',
      designation: cleanMotif ? `Règlement fournisseur : ${cleanMotif}` : `Règlement fournisseur (${compteNom})`,
      quantite: null,
      unite: null,
      prix_unitaire: null,
      montant,
      debit: 0,
      credit: montant,
      solde: 0,
      piece_ref: pieceRef,
      compte_nom: compteNom,
      raw: tx,
    })
  }

  // Trier chronologiquement (date croissante)
  mouvements.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Calcul du Grand Livre (solde progressif de la dette)
  let soldeProgressif = 0
  let totalDette = 0
  let totalRegle = 0

  const journal = mouvements.map((m) => {
    if (m.type === 'dette') {
      soldeProgressif += m.montant
      totalDette += m.montant
    } else {
      soldeProgressif -= m.montant
      totalRegle += m.montant
    }
    return {
      ...m,
      solde: soldeProgressif,
    }
  })

  return {
    fournisseur: {
      id: fExt?.id || `fournisseur-${encodeURIComponent(targetNomLower)}`,
      nom: targetNom,
      telephone,
      adresse,
      code_fournisseur: codeFournisseur,
      total_dette: totalDette,
      total_regle: totalRegle,
      solde_actuel: Math.max(0, soldeProgressif),
    },
    journal: journal.reverse(), // Du plus récent au plus ancien pour l'affichage
    totalDette,
    totalRegle,
    soldeActuel: Math.max(0, soldeProgressif),
  }
}

export async function getContextePaiementFournisseur() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { comptes: [] }

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('gie_id')
    .eq('id', user.id)
    .single()

  if (!userData) return { comptes: [] }

  const { data: comptes } = await supabase
    .from('comptes')
    .select('id, nom, type_compte')
    .eq('gie_id', userData.gie_id)
    .order('nom', { ascending: true })

  return {
    comptes: comptes || [],
  }
}

export async function addPaiementFournisseur(input: {
  fournisseur_nom: string
  montant: number
  compte_id: string
  date_paiement?: string
  mode_paiement?: 'espece' | 'cheque' | 'virement' | 'bon' | 'mobile_money' | 'autre'
  reference_piece?: string | null
  motif?: string | null
}) {
  const denied = await requirePermission('tresorerie', 'create')
  if (denied) return denied as never
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non authentifié" }

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('gie_id')
    .eq('id', user.id)
    .single()

  if (!userData) return { error: "Utilisateur introuvable" }

  const montant = Number(input.montant || 0)
  if (!montant || montant <= 0) return { error: "Montant de règlement invalide." }
  if (!input.compte_id) return { error: "Veuillez sélectionner le compte de trésorerie de décaissement." }
  if (!input.fournisseur_nom.trim()) return { error: "Fournisseur non spécifié." }

  const datePaiement = input.date_paiement || new Date().toISOString().slice(0, 10)
  const mode = input.mode_paiement || 'espece'
  const ref = input.reference_piece?.trim() || null
  const userMotif = input.motif?.trim() || ''

  let motifHumain = userMotif || `Règlement fournisseur - ${input.fournisseur_nom}`
  if (mode === 'cheque') {
    motifHumain = `Paiement par chèque${ref ? ` N° ${ref}` : ''} - ${input.fournisseur_nom}${userMotif ? ` (${userMotif})` : ''}`
  } else if (mode === 'virement') {
    motifHumain = `Virement bancaire${ref ? ` Réf: ${ref}` : ''} - ${input.fournisseur_nom}${userMotif ? ` (${userMotif})` : ''}`
  } else if (mode === 'mobile_money') {
    motifHumain = `Paiement Mobile Money${ref ? ` Réf: ${ref}` : ''} - ${input.fournisseur_nom}${userMotif ? ` (${userMotif})` : ''}`
  } else if (mode === 'bon') {
    motifHumain = `Paiement par bon${ref ? ` N° ${ref}` : ''} - ${input.fournisseur_nom}${userMotif ? ` (${userMotif})` : ''}`
  }

  // Tags structurés pour compatibilité et traçabilité
  const metaTags = [
    `[TIERS:${input.fournisseur_nom.trim()}]`,
    ref ? `[REF:${ref}]` : '',
    `[MODE:${mode}]`,
    `[TYPE:reglement_fournisseur]`,
  ].filter(Boolean).join(' ')

  const safeMotif = `${motifHumain} ${metaTags}`.trim()

  const { error } = await supabase.from('transactions').insert({
    gie_id: userData.gie_id,
    compte_id: input.compte_id,
    type_transaction: 'sortie',
    montant,
    motif: safeMotif,
    type_piece: 'facture_fournisseur',
    date_transaction: datePaiement,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/bilans/releve-fournisseur')
  revalidatePath('/tresorerie')
  revalidatePath('/tresorerie/journaux')
  revalidatePath('/bilans')
  revalidatePath('/dashboard')

  return { success: true }
}

