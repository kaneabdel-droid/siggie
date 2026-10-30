'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/utils/supabase/permissions'

export interface OperationOD {
  id: string
  date_operation: string
  tiers: string | null
  reference_piece: string | null
  montant: number
  libelle: string
  type_operation: 'charge' | 'produit'
  imputation_id?: string | null
  imputation_libelle?: string | null
  compte_id?: string | null
  compte_nom?: string | null
  created_at?: string
  source?: 'journal_od' | 'transaction'
}

export async function getOperationsOD(): Promise<{ operations?: OperationOD[]; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non authentifié" }

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('gie_id')
    .eq('id', user.id)
    .single()

  if (!userData) return { error: "Utilisateur introuvable" }

  const [imputationsRes, comptesRes] = await Promise.all([
    supabase.from('imputations').select('id, libelle, compte').eq('gie_id', userData.gie_id),
    supabase.from('comptes').select('id, nom, type_compte').eq('gie_id', userData.gie_id),
  ])

  const imputationsMap = new Map<string, string>()
  for (const imp of imputationsRes.data || []) {
    const full = imp.compte ? `${imp.libelle} — ${imp.compte}` : imp.libelle
    imputationsMap.set(imp.id, full)
  }

  const comptesMap = new Map<string, string>()
  for (const cp of comptesRes.data || []) {
    comptesMap.set(cp.id, cp.nom)
  }

  const operations: OperationOD[] = []

  // 1. Charger depuis la table journal_od si elle existe
  const { data: odData, error: odError } = await supabase
    .from('journal_od')
    .select('*')
    .eq('gie_id', userData.gie_id)
    .order('date_operation', { ascending: false })

  if (!odError && odData) {
    for (const od of odData) {
      const impLib = od.imputation_libelle || (od.imputation_id ? imputationsMap.get(od.imputation_id) : null) || 'Frais généraux'
      operations.push({
        id: od.id,
        date_operation: od.date_operation,
        tiers: od.tiers || null,
        reference_piece: od.reference_piece || null,
        montant: Number(od.montant || 0),
        libelle: od.libelle,
        type_operation: od.type_operation === 'produit' ? 'produit' : 'charge',
        imputation_id: od.imputation_id || null,
        imputation_libelle: impLib,
        compte_id: od.compte_id || null,
        compte_nom: od.compte_id ? comptesMap.get(od.compte_id) || 'Compte' : null,
        created_at: od.created_at,
        source: 'journal_od',
      })
    }
  }

  // 2. Charger les transactions de type 'od' ou marquées [TYPE:OD] pour compatibilité
  const { data: txData } = await supabase
    .from('transactions')
    .select('*')
    .eq('gie_id', userData.gie_id)
    .or("type_piece.eq.od,motif.ilike.%[OD]%,motif.ilike.%[TYPE:OD]%")
    .order('date_transaction', { ascending: false })

  const existingIds = new Set(operations.map((o) => o.id))

  for (const tx of txData || []) {
    if (existingIds.has(tx.id)) continue

    const motifStr = String(tx.motif || '')
    const tiersMatch = motifStr.match(/\[TIERS:([^\]]+)\]/)
    const refMatch = motifStr.match(/\[REF:([^\]]+)\]/)
    const impMatch = motifStr.match(/\[IMPUTATION:([^\]]+)\]/)
    const typeMatch = motifStr.match(/\[TYPE_OP:(charge|produit)\]/)

    const tiers = tiersMatch ? tiersMatch[1].trim() : (tx.tiers_nom || null)
    const refPiece = refMatch ? refMatch[1].trim() : (tx.reference_piece || null)
    const cleanLibelle = motifStr.replace(/\[[^\]]*\]/g, '').trim() || 'Opération diverse'
    const typeOp = typeMatch ? (typeMatch[1] as any) : (tx.type_transaction === 'entree' ? 'produit' : 'charge')
    const impLib = impMatch ? impMatch[1].trim() : (tx.imputation_id ? imputationsMap.get(tx.imputation_id) : 'Frais généraux')

    operations.push({
      id: tx.id,
      date_operation: tx.date_transaction || new Date().toISOString().slice(0, 10),
      tiers,
      reference_piece: refPiece,
      montant: Number(tx.montant || 0),
      libelle: cleanLibelle,
      type_operation: typeOp,
      imputation_id: tx.imputation_id || null,
      imputation_libelle: impLib,
      compte_id: tx.compte_id || null,
      compte_nom: tx.compte_id ? comptesMap.get(tx.compte_id) || 'Compte' : null,
      created_at: tx.created_at,
      source: 'transaction',
    })
  }

  // Trier par date d'opération antéchronologique
  operations.sort((a, b) => new Date(b.date_operation).getTime() - new Date(a.date_operation).getTime())

  return { operations }
}

export async function getContexteOD() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { imputations: [], comptes: [] }

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('gie_id')
    .eq('id', user.id)
    .single()

  if (!userData) return { imputations: [], comptes: [] }

  const [imputationsRes, comptesRes] = await Promise.all([
    supabase
      .from('imputations')
      .select('id, libelle, compte, categorie, nature')
      .eq('gie_id', userData.gie_id)
      .order('libelle', { ascending: true }),
    supabase
      .from('comptes')
      .select('id, nom, type_compte')
      .eq('gie_id', userData.gie_id)
      .order('nom', { ascending: true }),
  ])

  return {
    imputations: imputationsRes.data || [],
    comptes: comptesRes.data || [],
  }
}

export async function addOperationOD(input: {
  date_operation?: string
  tiers?: string | null
  reference_piece?: string | null
  montant: number
  libelle: string
  type_operation: 'charge' | 'produit'
  imputation_id?: string | null
  imputation_libelle?: string | null
  compte_id?: string | null
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
  if (!montant || montant <= 0) return { error: "Veuillez renseigner un montant valide." }
  if (!input.libelle?.trim()) return { error: "Le libellé de l'opération est obligatoire." }

  const dateOp = input.date_operation || new Date().toISOString().slice(0, 10)
  const tiers = input.tiers?.trim() || null
  const ref = input.reference_piece?.trim() || null
  const typeOp = input.type_operation === 'produit' ? 'produit' : 'charge'
  const impLib = input.imputation_libelle?.trim() || 'Frais généraux'

  // 1. Tenter l'insertion dans la table journal_od
  let insertedId: string | null = null
  const { data: odInserted, error: odError } = await supabase
    .from('journal_od')
    .insert({
      gie_id: userData.gie_id,
      date_operation: dateOp,
      tiers,
      reference_piece: ref,
      montant,
      libelle: input.libelle.trim(),
      type_operation: typeOp,
      imputation_id: input.imputation_id || null,
      imputation_libelle: impLib,
      compte_id: input.compte_id || null,
    })
    .select('id')
    .maybeSingle()

  if (odInserted?.id) {
    insertedId = odInserted.id
  }

  // 2. Si un compte de trésorerie est lié (décaissement ou encaissement réel), ou comme fallback dans transactions
  if (input.compte_id || odError) {
    const metaTags = [
      `[OD]`,
      `[TYPE_OP:${typeOp}]`,
      tiers ? `[TIERS:${tiers}]` : '',
      ref ? `[REF:${ref}]` : '',
      impLib ? `[IMPUTATION:${impLib}]` : '',
    ].filter(Boolean).join(' ')

    const safeMotif = `${input.libelle.trim()} ${metaTags}`.trim()
    const typeTx = typeOp === 'produit' ? 'entree' : 'sortie'

    // Si pas de compte_id et table journal_od absente, trouver le premier compte de caisse comme réceptacle technique
    let effectiveCompteId = input.compte_id
    if (!effectiveCompteId && odError) {
      const { data: defaultCompte } = await supabase
        .from('comptes')
        .select('id')
        .eq('gie_id', userData.gie_id)
        .limit(1)
        .maybeSingle()
      effectiveCompteId = defaultCompte?.id || null
    }

    if (effectiveCompteId) {
      await supabase.from('transactions').insert({
        gie_id: userData.gie_id,
        compte_id: effectiveCompteId,
        type_transaction: typeTx,
        montant,
        motif: safeMotif,
        type_piece: 'od',
        imputation_id: input.imputation_id || null,
        date_transaction: dateOp,
      })
    }
  }

  revalidatePath('/tresorerie/journal-od')
  revalidatePath('/tresorerie/journaux')
  revalidatePath('/tresorerie')
  revalidatePath('/bilans')
  revalidatePath('/bilans/suivi-budgetaire')

  return { success: true, id: insertedId }
}

export async function deleteOperationOD(id: string) {
  const denied = await requirePermission('tresorerie', 'delete')
  if (denied) return denied as never
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non authentifié" }

  // Supprimer de journal_od et de transactions si applicable
  await Promise.all([
    supabase.from('journal_od').delete().eq('id', id),
    supabase.from('transactions').delete().eq('id', id),
  ])

  revalidatePath('/tresorerie/journal-od')
  revalidatePath('/tresorerie/journaux')
  revalidatePath('/tresorerie')

  return { success: true }
}
