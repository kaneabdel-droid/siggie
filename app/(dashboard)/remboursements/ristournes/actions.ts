'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/utils/supabase/permissions'
import { fetchAll } from '@/utils/supabase/fetch-all'

export type SurplusMembre = {
  membre_id: string
  nom: string
  facture: number
  rembourse: number
  ristournes: number // numéraire + nature déjà rendues
  surplus: number // à rendre : remboursé - facturé - ristournes (jamais négatif)
}

export type RistourneLigne = {
  id: string
  membre: string
  montant: number
  compte: string
  date_ristourne: string
  motif: string | null
}

// Vue d'ensemble : surplus de remboursement restant à rendre à chaque membre, historique
// des ristournes en numéraire et comptes de trésorerie utilisables.
export async function getRistournesData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  try {
    const [membres, factures, remboursements, sortiesNature, ristournes, comptes] = await Promise.all([
      fetchAll<{ id: string; prenom: string; nom: string }>(supabase, 'membres', 'id, prenom, nom'),
      fetchAll<{ membre_id: string | null; montant_total: number | null; montant_interet: number | null }>(supabase, 'factures', 'id, membre_id, montant_total, montant_interet'),
      fetchAll<{ membre_id: string | null; montant_fcfa: number | null }>(supabase, 'remboursements', 'id, membre_id, montant_fcfa'),
      fetchAll<{ membre_id: string | null; quantite: number | null; prix_unitaire: number | null; type_sortie: string; tiers_type: string }>(supabase, 'sorties_stock_nature', 'id, membre_id, quantite, prix_unitaire, type_sortie, tiers_type'),
      fetchAll<{ id: string; membre_id: string; montant: number; compte_id: string | null; date_ristourne: string; motif: string | null; created_at: string }>(supabase, 'ristournes', 'id, membre_id, montant, compte_id, date_ristourne, motif, created_at'),
      fetchAll<{ id: string; nom: string; type_compte: string }>(supabase, 'comptes', 'id, nom, type_compte'),
    ])

    const nomMembre = new Map(membres.map((m) => [m.id, `${m.prenom} ${m.nom}`.trim()]))
    const cumul = new Map<string, { facture: number; rembourse: number; ristournes: number }>()
    const ligne = (id: string) => {
      let l = cumul.get(id)
      if (!l) cumul.set(id, (l = { facture: 0, rembourse: 0, ristournes: 0 }))
      return l
    }
    for (const f of factures) if (f.membre_id) ligne(f.membre_id).facture += Number(f.montant_total || 0) + Number(f.montant_interet || 0)
    for (const r of remboursements) if (r.membre_id) ligne(r.membre_id).rembourse += Number(r.montant_fcfa || 0)
    for (const s of sortiesNature) {
      if (s.type_sortie === 'ristourne' && s.tiers_type === 'membre' && s.membre_id) ligne(s.membre_id).ristournes += Number(s.quantite || 0) * Number(s.prix_unitaire || 0)
    }
    for (const r of ristournes) ligne(r.membre_id).ristournes += Number(r.montant || 0)

    const surplus: SurplusMembre[] = [...cumul.entries()]
      .map(([membre_id, l]) => ({
        membre_id,
        nom: nomMembre.get(membre_id) || '-',
        ...l,
        surplus: Math.max(0, l.rembourse - l.facture - l.ristournes),
      }))
      .filter((s) => s.surplus > 0)
      .sort((a, b) => b.surplus - a.surplus)

    const nomCompte = new Map(comptes.map((c) => [c.id, c.nom]))
    const historique: RistourneLigne[] = ristournes
      .map((r) => ({
        id: r.id,
        membre: nomMembre.get(r.membre_id) || '-',
        montant: Number(r.montant),
        compte: (r.compte_id && nomCompte.get(r.compte_id)) || '-',
        date_ristourne: r.date_ristourne,
        motif: r.motif,
        created_at: r.created_at,
      }))
      .sort((a, b) => (a.date_ristourne < b.date_ristourne ? 1 : a.date_ristourne > b.date_ristourne ? -1 : a.created_at < b.created_at ? 1 : -1))
      .map(({ created_at: _c, ...rest }) => { void _c; return rest })

    return { surplus, historique, comptes: comptes.map((c) => ({ id: c.id, nom: c.nom })) }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

// Ristourne en numéraire : sortie de trésorerie + réduction du remboursement du membre.
export async function addRistourne(input: {
  membre_id: string
  montant: number
  compte_id: string
  date_ristourne?: string
  motif?: string
}) {
  const denied = await requirePermission('ristournes', 'create')
  if (denied) return denied as never
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }
  const { data: userData } = await supabase.from('utilisateurs').select('gie_id').eq('id', user.id).single()
  if (!userData) return { error: 'Utilisateur introuvable' }

  if (!input.membre_id) return { error: 'Sélectionnez un membre' }
  if (!input.compte_id) return { error: 'Sélectionnez un compte de trésorerie' }
  if (!Number.isFinite(input.montant) || input.montant <= 0) return { error: 'Montant invalide' }

  const { data: membre } = await supabase.from('membres').select('prenom, nom').eq('id', input.membre_id).single()
  if (!membre) return { error: 'Membre introuvable' }

  const date = input.date_ristourne || new Date().toISOString().slice(0, 10)
  const motif = input.motif?.trim() || null

  // 1. Sortie de trésorerie (le trigger refuse un solde négatif sur un compte non bancaire).
  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .insert({
      gie_id: userData.gie_id,
      compte_id: input.compte_id,
      type_transaction: 'sortie',
      montant: input.montant,
      motif: `Ristourne - ${membre.prenom} ${membre.nom}${motif ? ` (${motif})` : ''}`,
      type_piece: 'ristourne',
      date_transaction: date,
    })
    .select('id')
    .single()
  if (txError || !transaction) return { error: txError?.message || 'Échec de la sortie de trésorerie' }

  // 2. La ristourne elle-même, liée à sa sortie de trésorerie.
  const { error } = await supabase.from('ristournes').insert({
    gie_id: userData.gie_id,
    membre_id: input.membre_id,
    montant: input.montant,
    compte_id: input.compte_id,
    transaction_id: transaction.id,
    date_ristourne: date,
    motif,
  })
  if (error) {
    // Pas de transaction SQL côté client : on annule la sortie pour ne pas laisser de trésorerie orpheline.
    await supabase.from('transactions').delete().eq('id', transaction.id)
    return { error: error.message }
  }

  revalidatePath('/remboursements/ristournes')
  revalidatePath('/tresorerie')
  revalidatePath('/bilans')
  return { success: true }
}

// Annule une ristourne : supprime aussi sa sortie de trésorerie.
export async function deleteRistourne(id: string) {
  const denied = await requirePermission('ristournes', 'delete')
  if (denied) return denied as never
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: ristourne } = await supabase.from('ristournes').select('transaction_id').eq('id', id).single()
  if (!ristourne) return { error: 'Ristourne introuvable' }

  const { error } = await supabase.from('ristournes').delete().eq('id', id)
  if (error) return { error: error.message }
  if (ristourne.transaction_id) {
    const { error: txError } = await supabase.from('transactions').delete().eq('id', ristourne.transaction_id)
    if (txError) return { error: `Ristourne supprimée, mais pas sa sortie de trésorerie : ${txError.message}` }
  }

  revalidatePath('/remboursements/ristournes')
  revalidatePath('/tresorerie')
  revalidatePath('/bilans')
  return { success: true }
}
