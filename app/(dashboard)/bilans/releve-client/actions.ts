'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/utils/supabase/permissions'

export async function getClients() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = user
    ? await supabase.from('utilisateurs').select('gie_id').eq('id', user.id).maybeSingle()
    : { data: null }

  const [clientsRes, membresRes, prestationsRes, sortiesRes] = await Promise.all([
    supabase.from('clients_externes').select('id, nom, telephone').order('nom', { ascending: true }),
    supabase.from('membres').select('id, prenom, nom'),
    supabase.from('materiel_prestations').select('id, client_nom, client_telephone, tiers_type, membre_id, client_id'),
    supabase.from('sorties_stock_nature').select('id, tiers_nom, tiers_type, client_id').eq('tiers_type', 'client'),
  ])

  if (clientsRes.error) return { error: clientsRes.error.message }

  const clients = [...(clientsRes.data || [])]
  const existingClientNames = new Set(clients.map((c) => c.nom.trim().toLowerCase()))
  const memberNames = new Set(
    (membresRes.data || []).flatMap((m) => [
      `${m.prenom} ${m.nom}`.trim().toLowerCase(),
      `${m.nom} ${m.prenom}`.trim().toLowerCase(),
    ])
  )

  if (userData?.gie_id) {
    const newClientsToInsert: { gie_id: string; nom: string; telephone: string | null }[] = []

    for (const p of (prestationsRes.data || []) as any[]) {
      if (p.tiers_type === 'membre' || p.membre_id || p.client_id) continue
      const nom = String(p.client_nom || '').trim()
      if (!nom) continue
      const lower = nom.toLowerCase()
      if (memberNames.has(lower) || existingClientNames.has(lower)) continue
      existingClientNames.add(lower)
      newClientsToInsert.push({
        gie_id: userData.gie_id,
        nom,
        telephone: p.client_telephone || null,
      })
    }

    for (const s of (sortiesRes.data || []) as any[]) {
      if (s.client_id) continue
      const nom = String(s.tiers_nom || '').trim()
      if (!nom) continue
      const lower = nom.toLowerCase()
      if (memberNames.has(lower) || existingClientNames.has(lower)) continue
      existingClientNames.add(lower)
      newClientsToInsert.push({
        gie_id: userData.gie_id,
        nom,
        telephone: null,
      })
    }

    if (newClientsToInsert.length > 0) {
      const { data: inserted } = await supabase
        .from('clients_externes')
        .insert(newClientsToInsert)
        .select('id, nom, telephone')
      if (inserted) {
        clients.push(...inserted)
        clients.sort((a, b) => a.nom.localeCompare(b.nom))
      }
    }
  }

  return { clients }
}

export async function addClient(nom: string, telephone?: string) {
  const denied = await requirePermission('bilans_clients', 'create')
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
  if (!nom.trim()) return { error: "Le nom du client est requis" }

  const { data, error } = await supabase
    .from('clients_externes')
    .insert({ gie_id: userData.gie_id, nom: nom.trim(), telephone: telephone?.trim() || null })
    .select('id, nom, telephone')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/bilans/releve-client')
  revalidatePath('/materiel/prestations')
  return { success: true, client: data }
}

type Mouvement = {
  id: string
  date: string
  type: 'vente' | 'prestation' | 'paiement'
  designation: string
  quantite: number | null
  unite?: string | null
  prix_unitaire: number | null
  montant: number
  raw?: any
}

export async function getReleveClient(clientId: string) {
  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients_externes')
    .select('id, nom, telephone')
    .eq('id', clientId)
    .single()

  if (!client) return { error: "Client introuvable" }

  const [ventesRes, prestationsRes, paiementsRes] = await Promise.all([
    supabase
      .from('sorties_stock_nature')
      .select('id, client_id, tiers_nom, tiers_type, quantite, prix_unitaire, date_sortie, motif, campagnes(nom, produit_collecte)')
      .eq('type_sortie', 'vente')
      .eq('tiers_type', 'client'),
    supabase
      .from('materiel_prestations')
      .select('*, materiel:materiel_id(nom), produit:produit_id(nom), campagne:campagne_id(nom)'),
    supabase
      .from('paiements_clients')
      .select('id, montant, date_paiement, motif')
      .eq('client_id', clientId),
  ])

  if (ventesRes.error) return { error: ventesRes.error.message }
  if (paiementsRes.error) return { error: paiementsRes.error.message }

  const clientNomLower = client.nom.trim().toLowerCase()

  const ventesClient = (ventesRes.data || []).filter((v: any) => {
    if (v.client_id) return v.client_id === clientId
    return String(v.tiers_nom || '').trim().toLowerCase() === clientNomLower
  })

  const prestationsClient = (prestationsRes.data || []).filter((p: any) => {
    if (p.tiers_type === 'membre' || p.membre_id) return false
    if (p.client_id) return p.client_id === clientId
    return String(p.client_nom || '').trim().toLowerCase() === clientNomLower
  })

  const mouvements: Mouvement[] = []

  for (const v of ventesClient) {
    const camp = Array.isArray(v.campagnes) ? v.campagnes[0] : v.campagnes
    const prod = camp?.produit_collecte || 'Stock en nature'
    mouvements.push({
      id: v.id,
      date: v.date_sortie,
      type: 'vente',
      designation: `Facture Vente : ${prod}${camp?.nom ? ` (${camp.nom})` : ''}`,
      quantite: Number(v.quantite),
      unite: 'kg',
      prix_unitaire: Number(v.prix_unitaire),
      montant: Number(v.quantite) * Number(v.prix_unitaire),
      raw: { ...v, client, campagne: camp },
    })
  }

  for (const p of prestationsClient) {
    const qte = Number(p.quantite_traitee || p.superficie || 0)
    const uniteStr = p.unite === 'autre' ? (p.unite_autre || '') : (p.unite || 'ha')
    const matNom = p.materiel?.nom ? ` (${p.materiel.nom})` : ''
    const prixUnit =
      p.mode_paiement === 'part_recolte'
        ? p.prix_unitaire_part != null
          ? Number(p.prix_unitaire_part)
          : null
        : p.tarif_unitaire != null
        ? Number(p.tarif_unitaire)
        : null

    mouvements.push({
      id: `prestation-${p.id}`,
      date: p.date_prestation,
      type: 'prestation',
      designation: `Facture Prestation : ${p.type_prestation}${matNom}`,
      quantite: qte > 0 ? qte : null,
      unite: uniteStr,
      prix_unitaire: prixUnit,
      montant: Number(p.montant_facture || 0),
      raw: { ...p, client },
    })
  }

  for (const p of paiementsRes.data || []) {
    mouvements.push({
      id: p.id,
      date: p.date_paiement,
      type: 'paiement',
      designation: p.motif ? `Paiement reçu (${p.motif})` : 'Paiement reçu',
      quantite: null,
      unite: null,
      prix_unitaire: null,
      montant: Number(p.montant),
    })
  }

  mouvements.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  let solde = 0
  const journal = mouvements.map((m) => {
    solde += m.type === 'paiement' ? -m.montant : m.montant
    return { ...m, solde }
  })

  return {
    client,
    journal: journal.reverse(),
    soldeActuel: solde,
  }
}

export async function addPaiementClient(input: {
  client_id: string
  montant: number
  date_paiement?: string
  motif?: string
}) {
  const denied = await requirePermission('bilans_clients', 'create')
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
  if (!input.montant || input.montant <= 0) return { error: "Montant invalide" }

  const { error } = await supabase.from('paiements_clients').insert({
    gie_id: userData.gie_id,
    client_id: input.client_id,
    montant: input.montant,
    date_paiement: input.date_paiement || new Date().toISOString().slice(0, 10),
    motif: input.motif?.trim() || null,
  })

  if (error) return { error: error.message }

  revalidatePath('/bilans/releve-client')
  return { success: true }
}
