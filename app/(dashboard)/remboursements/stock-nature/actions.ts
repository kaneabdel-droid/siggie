'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/utils/supabase/permissions'

type Mouvement = {
  id: string
  date: string
  type: 'entree' | 'vente' | 'ristourne'
  tiers: string
  tiers_type?: string
  membre?: any
  client?: any
  motif?: string | null
  prix_unitaire: number
  quantite: number
  origine_stock?: 'exploitation' | 'materiel' | 'achat' | string
  variete?: string | null
}

export async function getStockNature(campagneId: string) {
  const supabase = await createClient()

  const { data: campagne } = await supabase
    .from('campagnes')
    .select('id, nom, produit_collecte, prix_collecte')
    .eq('id', campagneId)
    .single()

  if (!campagne) return { error: "Campagne introuvable" }

  // Entrées : remboursements en nature
  const { data: factures } = await supabase
    .from('factures')
    .select('id')
    .eq('campagne_id', campagneId)

  const factureIds = factures?.map(f => f.id) || []

  // Récupérer les clients externes séparément pour éviter l'erreur de cache de schéma PostgREST
  const { data: clientsData } = await supabase
    .from('clients_externes')
    .select('id, nom, telephone')
  const clientMap = new Map((clientsData || []).map((c: any) => [c.id, c]))

  // Remboursements en nature pour cette campagne ou sans facture_id liée (prestations/clients)
  let rembQuery = supabase
    .from('remboursements')
    .select('id, quantite_nature, produit_nature, montant_fcfa, date_paiement, membre_id, facture_id, factures(client_nom), membres(id, prenom, nom, code_membre, telephone)')
    .eq('type_remboursement', 'nature')
    .not('quantite_nature', 'is', null)

  const { data: allRemb, error: rembError } = await rembQuery
  if (rembError) return { error: rembError.message }

  const remboursements = (allRemb || []).filter((r: any) => {
    if (r.facture_id && factureIds.length > 0) return factureIds.includes(r.facture_id)
    return true
  })

  // Sorties : ventes et ristournes enregistrées manuellement
  const { data: sorties, error: sortiesError } = await supabase
    .from('sorties_stock_nature')
    .select('id, type_sortie, tiers_type, membre_id, tiers_nom, client_id, quantite, prix_unitaire, motif, date_sortie, membres(id, prenom, nom, code_membre, telephone)')
    .eq('campagne_id', campagneId)

  if (sortiesError) return { error: sortiesError.message }

  const mouvements: Mouvement[] = []

  for (const r of remboursements) {
    const membre = Array.isArray(r.membres) ? r.membres[0] : r.membres
    const factureData = Array.isArray(r.factures) ? r.factures[0] : r.factures
    const clientNomFacture = factureData?.client_nom
    const client = clientNomFacture ? { nom: clientNomFacture } : null
    const quantite = Number(r.quantite_nature || 0)

    // Parse variety and origin from produit_nature if present
    const prodStr = String(r.produit_nature || '')
    let variete: string | null = null
    const varMatch = prodStr.match(/\[VARIETE:(.*?)\]/)
    if (varMatch) variete = varMatch[1].trim()

    let origineStock = 'exploitation'
    const origMatch = prodStr.match(/\[ORIGINE:(.*?)\]/)
    if (origMatch) origineStock = origMatch[1].trim()
    else if (!membre && client) origineStock = 'materiel'

    const tiersNom = membre ? `${membre.prenom} ${membre.nom}` : client?.nom || 'Client externe'

    mouvements.push({
      id: r.id,
      date: r.date_paiement,
      type: 'entree',
      tiers: tiersNom,
      tiers_type: membre ? 'membre' : 'client',
      membre,
      client,
      prix_unitaire: quantite > 0 ? Number(r.montant_fcfa) / quantite : Number(campagne.prix_collecte || 0),
      quantite,
      origine_stock: origineStock,
      variete,
      motif: prodStr.replace(/\[.*?\]/g, '').trim(),
    })
  }

  for (const s of sorties || []) {
    const membre = Array.isArray(s.membres) ? s.membres[0] : s.membres
    const client = s.client_id ? clientMap.get(s.client_id) : (s.tiers_nom ? { nom: s.tiers_nom } : null)
    mouvements.push({
      id: s.id,
      date: s.date_sortie,
      type: s.type_sortie as 'vente' | 'ristourne',
      tiers: s.tiers_type === 'membre' ? (membre ? `${membre.prenom} ${membre.nom}` : '-') : (client?.nom || s.tiers_nom || '-'),
      tiers_type: s.tiers_type,
      membre,
      client: client || (s.tiers_nom ? { nom: s.tiers_nom } : null),
      motif: s.motif,
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
  const denied = await requirePermission('stock_nature', 'create')
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
  revalidatePath('/facturation')
  revalidatePath('/bilans/releve-membre')
  revalidatePath('/bilans/releve-client')
  revalidatePath('/bilans/bilan-annuel')
  return { success: true }
}
