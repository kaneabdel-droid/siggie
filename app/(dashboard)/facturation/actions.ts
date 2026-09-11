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

// Répartit l'intérêt du/des crédit(s) validé(s) d'une campagne entre les factures
// des membres de cette campagne, au prorata soit de la superficie qu'ils exploitent
// pour la campagne, soit du montant déjà facturé (intrants + crédits) — stocké à part
// (factures.montant_interet) pour ne jamais être écrasé par une régénération de la
// facturation groupée.
export async function calculerInteret(campagneId: string, methode: 'superficie' | 'intrants') {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non authentifié" }

  const { data: credits } = await supabase
    .from('credits')
    .select('montant_accorde, taux_interet, duree_credit')
    .eq('campagne_id', campagneId)
    .eq('statut', 'valide')

  const totalInteret = (credits || []).reduce((sum, c) => {
    const montant = Number(c.montant_accorde) || 0
    const taux = Number(c.taux_interet) || 0
    const duree = Number(c.duree_credit) || 0
    return sum + montant * (taux / 100) * (duree / 12)
  }, 0)

  if (totalInteret <= 0) {
    return { error: "Aucun intérêt à répartir : aucun crédit validé avec taux et durée renseignés pour cette campagne." }
  }

  const { data: factures } = await supabase
    .from('factures')
    .select('id, membre_id, montant_total')
    .eq('campagne_id', campagneId)

  if (!factures || factures.length === 0) {
    return { error: "Aucune facture trouvée pour cette campagne. Générez d'abord la facturation groupée." }
  }

  const poidsParMembre: Record<string, number> = {}
  let totalPoids = 0

  if (methode === 'superficie') {
    const { data: campagneMembres } = await supabase
      .from('campagne_membres')
      .select('membre_id, superficie')
      .eq('campagne_id', campagneId)

    for (const cm of campagneMembres || []) {
      const s = Number(cm.superficie) || 0
      poidsParMembre[cm.membre_id] = s
      totalPoids += s
    }
  } else {
    for (const f of factures) {
      const m = Number(f.montant_total) || 0
      poidsParMembre[f.membre_id] = (poidsParMembre[f.membre_id] || 0) + m
      totalPoids += m
    }
  }

  if (totalPoids <= 0) {
    return {
      error: methode === 'superficie'
        ? "Aucune superficie déclarée pour les membres de cette campagne."
        : "Aucun montant facturé pour répartir l'intérêt."
    }
  }

  for (const f of factures) {
    const poids = poidsParMembre[f.membre_id] || 0
    const part = totalInteret * (poids / totalPoids)
    const { error } = await supabase
      .from('factures')
      .update({ montant_interet: part })
      .eq('id', f.id)
    if (error) return { error: error.message }
  }

  revalidatePath('/facturation')
  revalidatePath('/remboursements')
  revalidatePath('/bilans/releve-membre')
  return { success: true }
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
