'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/utils/supabase/permissions'

export async function getFactures() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Non authentifié")

  const { data: factures, error } = await supabase
    .from('factures')
    .select(`
      *,
      membre:membre_id (id, nom, prenom, code_membre, telephone, village),
      campagne:campagne_id (id, nom, produit_collecte, prix_collecte)
    `)
    .order('date_emission', { ascending: false })

  if (error) return { error: error.message }
  return { factures }
}

export async function updateMembreTelephone(membreId: string, telephone: string) {
  const denied = await requirePermission('membres', 'update')
  if (denied) return denied as never
  const supabase = await createClient()

  const clean = telephone.trim()
  const { error } = await supabase
    .from('membres')
    .update({ telephone: clean })
    .eq('id', membreId)

  if (error) return { error: error.message }
  revalidatePath('/facturation')
  revalidatePath('/membres')
  revalidatePath('/remboursements')
  return { success: true }
}

// Répartit l'intérêt du/des crédit(s) validé(s) d'une campagne entre les factures
// des membres de cette campagne, au prorata soit de la superficie qu'ils exploitent
// pour la campagne, soit du montant déjà facturé (intrants + crédits) — stocké à part
// (factures.montant_interet) pour ne jamais être écrasé par une régénération de la
// facturation groupée.
export async function calculerInteret(campagneId: string, methode: 'superficie' | 'intrants') {
  const denied = await requirePermission('facturation', 'update')
  if (denied) return denied as never
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
    .select('id, membre_id, montant_total, montant_paye')
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
    const totalDu = Number(f.montant_total || 0) + part
    const montantPaye = Number(f.montant_paye || 0)

    let statut: string = 'impayee'
    if (montantPaye >= totalDu && totalDu > 0) {
      statut = 'payee'
    } else if (montantPaye > 0) {
      statut = 'partiellement_paye'
    } else if (totalDu === 0 && montantPaye === 0) {
      statut = 'payee'
    } else {
      statut = 'impayee'
    }

    const { error } = await supabase
      .from('factures')
      .update({ montant_interet: part, statut })
      .eq('id', f.id)
    if (error) return { error: error.message }
  }

  revalidatePath('/facturation')
  revalidatePath('/remboursements')
  revalidatePath('/bilans')
  revalidatePath('/bilans/releve-membre')
  revalidatePath('/bilans/bilan-annuel')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function genererFacturesCampagne(campagneId: string) {
  const denied = await requirePermission('facturation', 'create')
  if (denied) return denied as never
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Non authentifié")

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('gie_id')
    .eq('id', user.id)
    .single()

  if (!userData) return { error: "Utilisateur introuvable" }

  // 1. Récupérer toutes les distributions d'intrants pour cette campagne et ce GIE
  const { data: distributions, error: distError } = await supabase
    .from('distribution_intrants')
    .select(`
      membre_id,
      quantite,
      intrant_id,
      intrants ( prix_unitaire )
    `)
    .eq('campagne_id', campagneId)
    .eq('gie_id', userData.gie_id)

  if (distError) return { error: distError.message }

  // 1.b Récupérer les prix de facturation configurés pour cette campagne
  const { data: campagneIntrants } = await supabase
    .from('campagne_intrants')
    .select('intrant_id, prix_facturation')
    .eq('campagne_id', campagneId)
    .eq('gie_id', userData.gie_id)

  const prixFacturationMap: Record<string, number> = {}
  if (campagneIntrants) {
    campagneIntrants.forEach(ci => {
      prixFacturationMap[ci.intrant_id] = Number(ci.prix_facturation)
    })
  }

  // 2. Agréger par membre les coûts des intrants distribués
  const montantsParMembre: Record<string, number> = {}

  if (distributions) {
    distributions.forEach(d => {
      const intrant = Array.isArray(d.intrants) ? d.intrants[0] : d.intrants
      const prixFacturation = prixFacturationMap[d.intrant_id] !== undefined
        ? prixFacturationMap[d.intrant_id]
        : Number(intrant?.prix_unitaire || 0)
      const cout = Number(d.quantite || 0) * prixFacturation
      montantsParMembre[d.membre_id] = (montantsParMembre[d.membre_id] || 0) + cout
    })
  }

  // 4. Récupérer toutes les factures existantes pour cette campagne et ce GIE
  const { data: existingFactures, error: factError } = await supabase
    .from('factures')
    .select('id, membre_id, montant_total, montant_paye, montant_interet, statut')
    .eq('campagne_id', campagneId)
    .eq('gie_id', userData.gie_id)

  if (factError) return { error: factError.message }

  // 4.b Récupérer les remboursements réels associés aux factures existantes
  const existingFactureMap = new Map<string, any>()
  const existingFactureIds: string[] = []
  for (const f of existingFactures || []) {
    existingFactureMap.set(f.membre_id, f)
    existingFactureIds.push(f.id)
  }

  const paiementsParFacture: Record<string, number> = {}
  if (existingFactureIds.length > 0) {
    const { data: remboursements } = await supabase
      .from('remboursements')
      .select('facture_id, montant_fcfa')
      .in('facture_id', existingFactureIds)
      .eq('gie_id', userData.gie_id)

    if (remboursements) {
      for (const r of remboursements) {
        paiementsParFacture[r.facture_id] = (paiementsParFacture[r.facture_id] || 0) + Number(r.montant_fcfa || 0)
      }
    }
  }

  let countCreated = 0
  let countUpdated = 0
  let countRemoved = 0

  // 5. Traiter les membres ayant des distributions ou des crédits
  const processedMembreIds = new Set<string>()

  for (const [membreId, montantTotal] of Object.entries(montantsParMembre)) {
    processedMembreIds.add(membreId)
    const existing = existingFactureMap.get(membreId)

    if (existing) {
      // Synchroniser le montant payé réel
      const montantPaye = paiementsParFacture[existing.id] !== undefined
        ? paiementsParFacture[existing.id]
        : Number(existing.montant_paye || 0)

      const montantInteret = Number(existing.montant_interet || 0)
      const totalDu = Number(montantTotal) + montantInteret

      let statut: string = 'impayee'
      if (montantPaye >= totalDu && totalDu > 0) {
        statut = 'payee'
      } else if (montantPaye > 0) {
        statut = 'partiellement_paye'
      } else if (totalDu === 0 && montantPaye === 0) {
        statut = 'payee'
      } else {
        statut = 'impayee'
      }

      const { error: updateErr } = await supabase
        .from('factures')
        .update({
          montant_total: montantTotal,
          montant_paye: montantPaye,
          statut,
        })
        .eq('id', existing.id)

      if (updateErr) return { error: updateErr.message }
      countUpdated++
    } else {
      // Créer une nouvelle facture
      const { error: insertErr } = await supabase
        .from('factures')
        .insert({
          gie_id: userData.gie_id,
          campagne_id: campagneId,
          membre_id: membreId,
          montant_total: montantTotal,
          montant_paye: 0,
          montant_interet: 0,
          statut: montantTotal === 0 ? 'payee' : 'impayee',
        })

      if (insertErr) return { error: insertErr.message }
      countCreated++
    }
  }

  // 6. Nettoyer ou mettre à jour les factures existantes de membres n'ayant plus de distributions ni crédits
  for (const existing of existingFactures || []) {
    if (!processedMembreIds.has(existing.membre_id)) {
      const montantPaye = paiementsParFacture[existing.id] !== undefined
        ? paiementsParFacture[existing.id]
        : Number(existing.montant_paye || 0)

      if (montantPaye > 0) {
        // Le membre a déjà effectué des paiements, préserver l'historique mais solder le principal
        await supabase
          .from('factures')
          .update({
            montant_total: 0,
            montant_paye: montantPaye,
            statut: 'payee',
          })
          .eq('id', existing.id)
        countUpdated++
      } else {
        // Aucune distribution, aucun crédit et aucun paiement : supprimer la facture orpheline
        await supabase
          .from('factures')
          .delete()
          .eq('id', existing.id)
        countRemoved++
      }
    }
  }

  // 7. Revalidation globale des données
  revalidatePath('/facturation')
  revalidatePath('/remboursements')
  revalidatePath('/bilans')
  revalidatePath('/bilans/releve-membre')
  revalidatePath('/bilans/bilan-annuel')
  revalidatePath('/dashboard')

  return {
    success: true,
    countCreated,
    countUpdated,
    countRemoved,
  }
}
