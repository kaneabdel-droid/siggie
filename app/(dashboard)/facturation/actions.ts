'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getFactures() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Non authentifié")

  const { data: factures, error } = await supabase
    .from('factures')
    .select(`
      *,
      membre:membre_id (nom, prenom, code_membre),
      campagne:campagne_id (nom, produit_collecte, prix_collecte)
    `)
    .order('date_emission', { ascending: false })

  if (error) return { error: error.message }
  return { factures }
}

export async function genererFacturesCampagne(campagneId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Non authentifié")

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('gie_id')
    .eq('id', user.id)
    .single()

  if (!userData) return { error: "Utilisateur introuvable" }

  // 1. Récupérer toutes les distributions d'intrants pour cette campagne
  const { data: distributions } = await supabase
    .from('distribution_intrants')
    .select(`
      membre_id,
      quantite,
      intrant_id
    `)
    .eq('campagne_id', campagneId)

  // 2. Récupérer tous les crédits validés pour cette campagne
  const { data: credits } = await supabase
    .from('credits')
    .select('membre_id, montant_demande')
    .eq('campagne_id', campagneId)
    .eq('statut', 'valide')

  // 3. Agréger par membre
  const montantsParMembre: Record<string, number> = {}

  // 1.b Récupérer les prix de facturation configurés pour cette campagne
  const { data: campagneIntrants } = await supabase
    .from('campagne_intrants')
    .select('intrant_id, prix_facturation')
    .eq('campagne_id', campagneId)

  const prixFacturationMap: Record<string, number> = {}
  if (campagneIntrants) {
    campagneIntrants.forEach(ci => {
      prixFacturationMap[ci.intrant_id] = Number(ci.prix_facturation)
    })
  }

  if (distributions) {
    distributions.forEach(d => {
      const prixFacturation = prixFacturationMap[d.intrant_id] || 0
      const cout = Number(d.quantite) * prixFacturation
      montantsParMembre[d.membre_id] = (montantsParMembre[d.membre_id] || 0) + cout
    })
  }

  if (credits) {
    credits.forEach(c => {
      montantsParMembre[c.membre_id] = (montantsParMembre[c.membre_id] || 0) + Number(c.montant_demande)
    })
  }

  // 4. Insérer ou mettre à jour les factures
  for (const [membreId, montantTotal] of Object.entries(montantsParMembre)) {
    // Vérifier si une facture existe déjà pour ce membre et cette campagne
    const { data: existingFacture } = await supabase
      .from('factures')
      .select('id, montant_paye')
      .eq('membre_id', membreId)
      .eq('campagne_id', campagneId)
      .single()

    if (existingFacture) {
      // Mettre à jour si nécessaire
      const statut = existingFacture.montant_paye >= montantTotal ? 'payee' : 'impayee'
      await supabase
        .from('factures')
        .update({ montant_total: montantTotal, statut })
        .eq('id', existingFacture.id)
    } else {
      // Créer une nouvelle facture
      await supabase
        .from('factures')
        .insert({
          gie_id: userData.gie_id,
          campagne_id: campagneId,
          membre_id: membreId,
          montant_total: montantTotal,
          montant_paye: 0,
          statut: 'impayee'
        })
    }
  }

  revalidatePath('/facturation')
  return { success: true }
}
