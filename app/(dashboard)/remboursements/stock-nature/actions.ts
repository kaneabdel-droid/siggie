'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

type Mouvement = {
  id: string
  date: string
  type: 'entree' | 'vente' | 'ristourne'
  tiers: string
  prix_unitaire: number
  quantite: number
}

export async function getStockNature(campagneId: string) {
  const supabase = await createClient()

  const { data: campagne } = await supabase
    .from('campagnes')
    .select('nom, produit_collecte, prix_collecte')
    .eq('id', campagneId)
    .single()

  if (!campagne) return { error: "Campagne introuvable" }

  // Entrées : remboursements en nature déjà enregistrés pour les factures de cette campagne
  const { data: factures } = await supabase
    .from('factures')
    .select('id')
    .eq('campagne_id', campagneId)

  const factureIds = factures?.map(f => f.id) || []

  let remboursements: any[] = []
  if (factureIds.length > 0) {
    const { data, error } = await supabase
      .from('remboursements')
      .select('id, quantite_nature, montant_fcfa, date_paiement, membre_id, membres(prenom, nom)')
      .eq('type_remboursement', 'nature')
      .not('quantite_nature', 'is', null)
      .in('facture_id', factureIds)

    if (error) return { error: error.message }
    remboursements = data || []
  }

  // Sorties : ventes et ristournes enregistrées manuellement
  const { data: sorties, error: sortiesError } = await supabase
    .from('sorties_stock_nature')
    .select('id, type_sortie, tiers_type, membre_id, tiers_nom, client_id, quantite, prix_unitaire, date_sortie, membres(prenom, nom), clients_externes(nom)')
    .eq('campagne_id', campagneId)

  if (sortiesError) return { error: sortiesError.message }

  const mouvements: Mouvement[] = []

  for (const r of remboursements) {
    const membre = Array.isArray(r.membres) ? r.membres[0] : r.membres
    const quantite = Number(r.quantite_nature || 0)
    mouvements.push({
      id: r.id,
      date: r.date_paiement,
      type: 'entree',
      tiers: membre ? `${membre.prenom} ${membre.nom}` : '-',
      prix_unitaire: quantite > 0 ? Number(r.montant_fcfa) / quantite : 0,
      quantite,
    })
  }

  for (const s of sorties || []) {
    const membre = Array.isArray(s.membres) ? s.membres[0] : s.membres
    const client = Array.isArray(s.clients_externes) ? s.clients_externes[0] : s.clients_externes
    mouvements.push({
      id: s.id,
      date: s.date_sortie,
      type: s.type_sortie as 'vente' | 'ristourne',
      tiers: s.tiers_type === 'membre' ? (membre ? `${membre.prenom} ${membre.nom}` : '-') : (client?.nom || s.tiers_nom || '-'),
      prix_unitaire: Number(s.prix_unitaire || 0),
      quantite: Number(s.quantite),
    })
  }

  mouvements.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  let solde = 0
  const journal = mouvements.map((m) => {
    if (m.type === 'entree') solde += m.quantite
    else solde -= m.quantite
    return { ...m, solde }
  })

  return {
    journal: journal.reverse(),
    soldeActuel: solde,
    campagne,
  }
}

export async function addSortieStockNature(input: {
  campagne_id: string
  type_sortie: string
  tiers_type: string
  membre_id?: string
  client_id?: string
  quantite: number
  prix_unitaire: number
  motif?: string
  date_sortie?: string
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non authentifié" }

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('gie_id')
    .eq('id', user.id)
    .single()

  if (!userData) return { error: "Utilisateur introuvable" }
  if (!input.quantite || input.quantite <= 0) return { error: "Quantité invalide" }
  if (input.tiers_type === 'membre' && !input.membre_id) return { error: "Sélectionnez un membre" }
  if (input.tiers_type === 'client' && !input.client_id) return { error: "Sélectionnez un client" }

  const { error } = await supabase.from('sorties_stock_nature').insert({
    gie_id: userData.gie_id,
    campagne_id: input.campagne_id,
    type_sortie: input.type_sortie,
    tiers_type: input.tiers_type,
    membre_id: input.tiers_type === 'membre' ? input.membre_id : null,
    client_id: input.tiers_type === 'client' ? input.client_id : null,
    quantite: input.quantite,
    prix_unitaire: input.prix_unitaire,
    motif: input.motif?.trim() || null,
    date_sortie: input.date_sortie || new Date().toISOString().slice(0, 10),
  })

  if (error) return { error: error.message }

  revalidatePath('/remboursements/stock-nature')
  return { success: true }
}
