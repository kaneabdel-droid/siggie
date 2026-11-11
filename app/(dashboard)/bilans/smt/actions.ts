'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/utils/supabase/permissions'
import { fetchAll } from '@/utils/supabase/fetch-all'
import { calculerSMT, type SMTData } from '@/lib/smt'
import type { BilanRaw, RubriqueSaisie, Saisies } from '@/lib/bilan-annuel'

export async function getSMT(annee: number): Promise<SMTData | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }
  if (!Number.isInteger(annee) || annee < 2000 || annee > 2100) return { error: 'Année invalide' }

  try {
    const [
      membres, clients,
      intrants, achats, distributions, factures, remboursements, sorties, campagnes,
      paiementsClients, materiels, prestations, consommations, comptes, transactions, credits, ristournes, saisiesRows,
    ] = await Promise.all([
      fetchAll<NonNullable<BilanRaw['membres']>[number]>(supabase, 'membres', 'id, solde_initial'),
      fetchAll<NonNullable<BilanRaw['clients']>[number]>(supabase, 'clients_externes', 'id, nom'),
      fetchAll<BilanRaw['intrants'][number]>(supabase, 'intrants', 'id, nom, type_intrant, quantite_stock, prix_unitaire'),
      fetchAll<BilanRaw['achats'][number]>(supabase, 'achats_intrants', 'id, intrant_id, quantite, prix_unitaire, date_achat'),
      fetchAll<BilanRaw['distributions'][number]>(supabase, 'distribution_intrants', 'id, intrant_id, quantite, date_distribution'),
      fetchAll<BilanRaw['factures'][number]>(supabase, 'factures', 'id, membre_id, campagne_id, montant_total, montant_interet, date_emission'),
      fetchAll<BilanRaw['remboursements'][number]>(supabase, 'remboursements', 'id, facture_id, membre_id, type_remboursement, montant_fcfa, quantite_nature, date_paiement, produit_nature'),
      fetchAll<BilanRaw['sorties'][number]>(supabase, 'sorties_stock_nature', 'id, campagne_id, membre_id, client_id, type_sortie, tiers_type, tiers_nom, quantite, prix_unitaire, date_sortie, motif'),
      fetchAll<BilanRaw['campagnes'][number]>(supabase, 'campagnes', 'id, prix_collecte'),
      fetchAll<BilanRaw['paiementsClients'][number]>(supabase, 'paiements_clients', 'id, client_id, montant, date_paiement, motif'),
      fetchAll<BilanRaw['materiels'][number]>(supabase, 'materiels', 'id, valeur_acquisition, duree_vie_economique, date_acquisition'),
      fetchAll<BilanRaw['prestations'][number]>(supabase, 'materiel_prestations', '*'),
      fetchAll<BilanRaw['consommations'][number]>(supabase, 'materiel_consommations', 'id, montant_total, date_consommation'),
      fetchAll<BilanRaw['comptes'][number]>(supabase, 'comptes', 'id, nom, solde_initial'),
      fetchAll<BilanRaw['transactions'][number]>(supabase, 'transactions', 'id, compte_id, type_transaction, montant, date_transaction, type_piece, credit_id, motif'),
      fetchAll<BilanRaw['credits'][number]>(supabase, 'credits', 'id, statut, montant_accorde, taux_interet, duree_credit, date_demande, but_credit'),
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
      membres,
      clients,
      intrants,
      achats,
      distributions,
      factures,
      remboursements,
      sorties,
      campagnes,
      paiementsClients,
      materiels,
      prestations,
      consommations,
      comptes,
      transactions,
      credits,
      ristournes,
    }

    return calculerSMT(raw, annee, saisiesDe(annee))
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

export async function saveSmtSaisie(annee: number, rubrique: string, montant: number) {
  const denied = await requirePermission('bilan_annuel', 'update')
  if (denied) return denied as never
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('gie_id')
    .eq('id', user.id)
    .single()
  if (!userData?.gie_id) return { error: 'GIE introuvable' }

  const clean = Number.isFinite(montant) ? Math.round(montant) : 0

  const { error } = await supabase
    .from('bilan_saisies')
    .upsert(
      {
        gie_id: userData.gie_id,
        annee,
        rubrique,
        montant: clean,
      },
      { onConflict: 'gie_id,annee,rubrique' }
    )

  if (error) return { error: error.message }
  revalidatePath('/bilans/smt')
  return { success: true }
}

