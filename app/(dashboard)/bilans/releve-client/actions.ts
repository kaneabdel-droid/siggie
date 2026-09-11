'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getClients() {
  const supabase = await createClient()

  const { data: clients, error } = await supabase
    .from('clients_externes')
    .select('id, nom, telephone')
    .order('nom', { ascending: true })

  if (error) return { error: error.message }
  return { clients }
}

export async function addClient(nom: string, telephone?: string) {
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
  return { success: true, client: data }
}

type Mouvement = {
  id: string
  date: string
  type: 'vente' | 'paiement'
  quantite: number | null
  prix_unitaire: number | null
  montant: number
}

export async function getReleveClient(clientId: string) {
  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients_externes')
    .select('nom, telephone')
    .eq('id', clientId)
    .single()

  if (!client) return { error: "Client introuvable" }

  const { data: ventes, error: ventesError } = await supabase
    .from('sorties_stock_nature')
    .select('id, quantite, prix_unitaire, date_sortie')
    .eq('client_id', clientId)
    .eq('type_sortie', 'vente')

  if (ventesError) return { error: ventesError.message }

  const { data: paiements, error: paiementsError } = await supabase
    .from('paiements_clients')
    .select('id, montant, date_paiement')
    .eq('client_id', clientId)

  if (paiementsError) return { error: paiementsError.message }

  const mouvements: Mouvement[] = []

  for (const v of ventes || []) {
    mouvements.push({
      id: v.id,
      date: v.date_sortie,
      type: 'vente',
      quantite: Number(v.quantite),
      prix_unitaire: Number(v.prix_unitaire),
      montant: Number(v.quantite) * Number(v.prix_unitaire),
    })
  }

  for (const p of paiements || []) {
    mouvements.push({
      id: p.id,
      date: p.date_paiement,
      type: 'paiement',
      quantite: null,
      prix_unitaire: null,
      montant: Number(p.montant),
    })
  }

  mouvements.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  let solde = 0
  const journal = mouvements.map((m) => {
    solde += m.type === 'vente' ? m.montant : -m.montant
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
