'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/utils/supabase/permissions'
import { fetchAll } from '@/utils/supabase/fetch-all'
import {
  calculerBilan,
  RUBRIQUES_SAISIE,
  type BilanCalcule,
  type BilanRaw,
  type RubriqueSaisie,
  type Saisies,
} from '@/lib/bilan-annuel'


export type BilanAnnuelData = {
  annee: number
  n: BilanCalcule
  n1: BilanCalcule
  saisies: Saisies
}

export async function getBilanAnnuel(annee: number): Promise<BilanAnnuelData | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }
  if (!Number.isInteger(annee) || annee < 2000 || annee > 2100) return { error: 'Année invalide' }

  try {
    const [
      intrants, achats, distributions, factures, remboursements, sorties, campagnes,
      paiementsClients, materiels, prestations, consommations, comptes, transactions, credits, ristournes, saisiesRows,
    ] = await Promise.all([
      fetchAll<BilanRaw['intrants'][number]>(supabase, 'intrants', 'id, quantite_stock, prix_unitaire'),
      fetchAll<BilanRaw['achats'][number]>(supabase, 'achats_intrants', 'id, intrant_id, quantite, prix_unitaire, date_achat'),
      fetchAll<BilanRaw['distributions'][number]>(supabase, 'distribution_intrants', 'id, intrant_id, quantite, date_distribution'),
      fetchAll<BilanRaw['factures'][number]>(supabase, 'factures', 'id, membre_id, campagne_id, montant_total, montant_interet, date_emission'),
      fetchAll<BilanRaw['remboursements'][number]>(supabase, 'remboursements', 'id, facture_id, membre_id, type_remboursement, montant_fcfa, quantite_nature, date_paiement'),
      fetchAll<BilanRaw['sorties'][number]>(supabase, 'sorties_stock_nature', 'id, campagne_id, membre_id, type_sortie, tiers_type, quantite, prix_unitaire, date_sortie'),
      fetchAll<BilanRaw['campagnes'][number]>(supabase, 'campagnes', 'id, prix_collecte'),
      fetchAll<BilanRaw['paiementsClients'][number]>(supabase, 'paiements_clients', 'id, montant, date_paiement'),
      fetchAll<BilanRaw['materiels'][number]>(supabase, 'materiels', 'id, valeur_acquisition, duree_vie_economique, date_acquisition'),
      fetchAll<BilanRaw['prestations'][number]>(supabase, 'materiel_prestations', 'id, montant_facture, date_prestation'),
      fetchAll<BilanRaw['consommations'][number]>(supabase, 'materiel_consommations', 'id, montant_total, date_consommation'),
      fetchAll<BilanRaw['comptes'][number]>(supabase, 'comptes', 'id, solde_initial'),
      fetchAll<BilanRaw['transactions'][number]>(supabase, 'transactions', 'id, type_transaction, montant, date_transaction, type_piece, credit_id'),
      fetchAll<BilanRaw['credits'][number]>(supabase, 'credits', 'id, statut, montant_accorde, taux_interet, duree_credit, date_demande'),
      fetchAll<BilanRaw['ristournes'][number]>(supabase, 'ristournes', 'id, membre_id, montant, date_ristourne'),
      supabase.from('bilan_saisies').select('annee, rubrique, montant').in('annee', [annee, annee - 1]),
    ])

    if (saisiesRows.error) return { error: saisiesRows.error.message }

    const saisiesDe = (y: number): Saisies => {
      const out: Saisies = {}
      for (const r of saisiesRows.data ?? []) {
        if (r.annee === y) out[r.rubrique as RubriqueSaisie] = Number(r.montant) || 0
      }
      return out
    }

    const raw: BilanRaw = {
      intrants, achats, distributions, factures, remboursements, sorties, campagnes,
      paiementsClients, materiels, prestations, consommations, comptes, transactions, credits, ristournes,
    }

    return {
      annee,
      n: calculerBilan(raw, annee, saisiesDe(annee)),
      n1: calculerBilan(raw, annee - 1, saisiesDe(annee - 1)),
      saisies: saisiesDe(annee),
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

export async function saveBilanSaisie(annee: number, rubrique: string, montant: number) {
  const denied = await requirePermission('bilan_annuel', 'update')
  if (denied) return denied as never
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }
  if (!(RUBRIQUES_SAISIE as readonly string[]).includes(rubrique)) return { error: 'Rubrique inconnue' }
  if (!Number.isInteger(annee) || annee < 2000 || annee > 2100) return { error: 'Année invalide' }
  if (!Number.isFinite(montant)) return { error: 'Montant invalide' }

  const { data: userData } = await supabase.from('utilisateurs').select('gie_id').eq('id', user.id).single()
  if (!userData) return { error: 'Utilisateur introuvable' }

  const { error } = await supabase.from('bilan_saisies').upsert(
    { gie_id: userData.gie_id, annee, rubrique, montant, updated_at: new Date().toISOString() },
    { onConflict: 'gie_id,annee,rubrique' }
  )
  if (error) return { error: error.message }

  revalidatePath('/bilans/bilan-annuel')
  return { success: true }
}
