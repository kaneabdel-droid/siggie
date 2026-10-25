'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/utils/supabase/permissions'

export async function getFactures() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Non authentifié")

  const [facturesRes, prestationsRes, ventesRes, membresRes, clientsRes] = await Promise.all([
    supabase
      .from('factures')
      .select(`
        *,
        membre:membre_id (id, nom, prenom, code_membre, telephone, village),
        campagne:campagne_id (id, nom, produit_collecte, prix_collecte)
      `)
      .order('date_emission', { ascending: false }),
    supabase
      .from('materiel_prestations')
      .select(`
        *,
        materiel:materiel_id (id, nom),
        produit:produit_id (id, nom),
        campagne:campagne_id (id, nom, produit_collecte, prix_collecte)
      `)
      .order('date_prestation', { ascending: false }),
    supabase
      .from('sorties_stock_nature')
      .select(`
        *,
        campagne:campagne_id (id, nom, produit_collecte, prix_collecte)
      `)
      .eq('type_sortie', 'vente')
      .order('date_sortie', { ascending: false }),
    supabase.from('membres').select('id, nom, prenom, code_membre, telephone, village'),
    supabase.from('clients_externes').select('id, nom, telephone'),
  ])

  if (facturesRes.error) return { error: facturesRes.error.message }

  const membresById = new Map<string, any>()
  const membresByName = new Map<string, any>()
  for (const m of membresRes.data || []) {
    membresById.set(m.id, m)
    membresByName.set(`${m.prenom} ${m.nom}`.trim().toLowerCase(), m)
    membresByName.set(`${m.nom} ${m.prenom}`.trim().toLowerCase(), m)
  }

  const clientsById = new Map<string, any>()
  const clientsByName = new Map<string, any>()
  for (const c of clientsRes.data || []) {
    clientsById.set(c.id, c)
    clientsByName.set(String(c.nom || '').trim().toLowerCase(), c)
  }

  const facturesCampagne = (facturesRes.data || []).map((f: any) => ({
    ...f,
    type_document: 'campagne' as const,
    tiers_type: 'membre' as const,
    designation: f.campagne?.nom ? `Facture Campagne — ${f.campagne.nom}` : 'Facture Campagne',
  }))

  const facturesPrestations = (prestationsRes.data || []).map((p: any) => {
    const cNomLower = String(p.client_nom || '').trim().toLowerCase()
    const matchedMembre = p.membre_id
      ? membresById.get(p.membre_id)
      : p.tiers_type === 'membre' || (!p.client_id && membresByName.has(cNomLower))
      ? membresByName.get(cNomLower)
      : null
    const isMembre = p.tiers_type === 'membre' || Boolean(matchedMembre)
    const matchedClient = !isMembre
      ? (p.client_id ? clientsById.get(p.client_id) : clientsByName.get(cNomLower)) || {
          id: p.client_id || null,
          nom: p.client_nom || 'Client externe',
          telephone: p.client_telephone || null,
        }
      : null

    const montant = Number(p.montant_facture || 0)
    const qte = Number(p.quantite_traitee || p.superficie || 0)
    const uniteStr = p.unite === 'autre' ? (p.unite_autre || '') : (p.unite || 'ha')

    return {
      id: `prestation-${p.id}`,
      raw_id: p.id,
      type_document: 'prestation' as const,
      tiers_type: isMembre ? ('membre' as const) : ('client' as const),
      membre_id: matchedMembre?.id || p.membre_id || null,
      membre: matchedMembre || null,
      client_id: matchedClient?.id || p.client_id || null,
      client: matchedClient || null,
      client_nom: p.client_nom || (matchedMembre ? `${matchedMembre.prenom} ${matchedMembre.nom}`.trim() : matchedClient?.nom),
      client_telephone: p.client_telephone || matchedMembre?.telephone || matchedClient?.telephone || null,
      campagne_id: p.campagne_id || p.campagne?.id || null,
      campagne: p.campagne || null,
      designation: `${p.type_prestation || 'Prestation'}${p.materiel?.nom ? ` (${p.materiel.nom})` : ''}${qte > 0 ? ` · ${qte} ${uniteStr}` : ''}`,
      date_emission: p.date_prestation || p.created_at,
      montant_total: montant,
      montant_interet: 0,
      montant_paye: 0,
      statut: 'impayee',
      imputation_releve: isMembre ? 'releve_membre' : 'releve_client',
      raw: { ...p, membre: matchedMembre, client: matchedClient, tiers_type: isMembre ? 'membre' : 'client' },
    }
  })

  const facturesVentes = (ventesRes.data || []).map((v: any) => {
    const isMembre = v.tiers_type === 'membre' || Boolean(v.membre_id)
    const matchedMembre = v.membre_id ? membresById.get(v.membre_id) : null
    const tNomLower = String(v.tiers_nom || '').trim().toLowerCase()
    const matchedClient = !isMembre
      ? (v.client_id ? clientsById.get(v.client_id) : clientsByName.get(tNomLower)) || {
          id: v.client_id || null,
          nom: v.tiers_nom || 'Client externe',
          telephone: null,
        }
      : null

    const quantite = Number(v.quantite || 0)
    const prixUnitaire = Number(v.prix_unitaire || 0)
    const montant = quantite * prixUnitaire
    const prod = v.campagne?.produit_collecte || 'Stock en nature'

    return {
      id: `vente-${v.id}`,
      raw_id: v.id,
      type_document: 'vente_stock' as const,
      tiers_type: isMembre ? ('membre' as const) : ('client' as const),
      membre_id: matchedMembre?.id || v.membre_id || null,
      membre: matchedMembre || null,
      client_id: matchedClient?.id || v.client_id || null,
      client: matchedClient || null,
      client_nom: matchedMembre ? `${matchedMembre.prenom} ${matchedMembre.nom}`.trim() : (matchedClient?.nom || v.tiers_nom || 'Client'),
      client_telephone: matchedMembre?.telephone || matchedClient?.telephone || null,
      campagne_id: v.campagne_id || v.campagne?.id || null,
      campagne: v.campagne || null,
      designation: `Vente ${prod} (${quantite} kg × ${prixUnitaire.toLocaleString('fr-FR')})`,
      date_emission: v.date_sortie || v.created_at,
      montant_total: montant,
      montant_interet: 0,
      montant_paye: 0,
      statut: 'impayee',
      imputation_releve: isMembre ? 'releve_membre' : 'releve_client',
      raw: { ...v, membre: matchedMembre, client: matchedClient, montant_total: montant },
    }
  })

  const factures = [...facturesCampagne, ...facturesPrestations, ...facturesVentes].sort((a, b) => {
    const ta = a.date_emission ? new Date(a.date_emission).getTime() : 0
    const tb = b.date_emission ? new Date(b.date_emission).getTime() : 0
    return tb - ta
  })

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
