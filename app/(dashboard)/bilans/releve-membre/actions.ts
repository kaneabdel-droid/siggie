'use server'

import { createClient } from '@/utils/supabase/server'

export async function getReleveMembre(membreId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non authentifié" }

  const { data: membre } = await supabase
    .from('membres')
    .select('id, prenom, nom, code_membre, telephone, village, solde_initial, created_at')
    .eq('id', membreId)
    .single()

  if (!membre) return { error: "Membre introuvable" }

  const [facturesRes, prestationsRes, sortiesStockRes, ristournesRes] = await Promise.all([
    supabase
      .from('factures')
      .select('id, montant_total, montant_interet, montant_paye, statut, date_emission, created_at, campagnes(id, nom, date_debut, produit_collecte, prix_collecte)')
      .eq('membre_id', membreId)
      .order('date_emission', { ascending: true }),
    supabase
      .from('materiel_prestations')
      .select('*, materiel:materiel_id(nom), produit:produit_id(nom), campagne:campagne_id(nom)')
      .order('date_prestation', { ascending: true }),
    supabase
      .from('sorties_stock_nature')
      .select('id, type_sortie, quantite, prix_unitaire, date_sortie, motif, campagnes(nom, produit_collecte)')
      .eq('membre_id', membreId)
      .eq('tiers_type', 'membre')
      .in('type_sortie', ['vente', 'ristourne'])
      .order('date_sortie', { ascending: true }),
    supabase
      .from('ristournes')
      .select('id, montant, date_ristourne, motif, created_at, comptes:compte_id(nom)')
      .eq('membre_id', membreId)
      .order('date_ristourne', { ascending: true }),
  ])

  if (facturesRes.error) return { error: facturesRes.error.message }

  const nomComplet1 = `${membre.prenom} ${membre.nom}`.trim().toLowerCase()
  const nomComplet2 = `${membre.nom} ${membre.prenom}`.trim().toLowerCase()

  // Filtrer les prestations appartenant à ce membre (par membre_id ou par correspondance de nom)
  const prestationsMembre = (prestationsRes.data || []).filter((p: any) => {
    if (p.membre_id) return p.membre_id === membreId
    if (p.tiers_type === 'client' && p.client_id) return false
    const cNom = String(p.client_nom || '').trim().toLowerCase()
    return cNom !== '' && (cNom === nomComplet1 || cNom === nomComplet2)
  })

  const soldeInitial = Number(membre.solde_initial || 0)
  let solde = soldeInitial
  const lignes: any[] = []

  if (soldeInitial !== 0) {
    lignes.push({
      id: 'solde-initial',
      type_ligne: 'solde_initial',
      campagne: 'Solde initial (Report)',
      date: membre.created_at || null,
      montant_facture: soldeInitial > 0 ? soldeInitial : 0,
      montant_paye: soldeInitial < 0 ? Math.abs(soldeInitial) : 0,
      montant_ristourne: 0,
      solde_progressif: soldeInitial,
    })
  }

  type OperationMembre = {
    id: string
    type_ligne: 'facture_campagne' | 'prestation_materiel' | 'vente_stock' | 'ristourne_numeraire' | 'ristourne_nature'
    campagne: string
    date: string | null
    montant_facture: number
    montant_paye: number
    montant_ristourne?: number
    raw?: any
  }

  const operations: OperationMembre[] = []

  for (const f of facturesRes.data || []) {
    const campagne = Array.isArray(f.campagnes) ? f.campagnes[0] : f.campagnes
    const facture = Number(f.montant_total || 0) + Number(f.montant_interet || 0)
    const paye = Number(f.montant_paye || 0)
    operations.push({
      id: f.id,
      type_ligne: 'facture_campagne',
      campagne: campagne?.nom ? `Facture Campagne — ${campagne.nom}` : 'Facture Campagne',
      date: f.date_emission || f.created_at,
      montant_facture: facture,
      montant_paye: paye,
      montant_ristourne: 0,
      raw: { ...f, membre, campagne },
    })
  }

  for (const p of prestationsMembre) {
    const montant = Number(p.montant_facture || 0)
    const matNom = p.materiel?.nom ? ` (${p.materiel.nom})` : ''
    const campNom = p.campagne?.nom ? ` · ${p.campagne.nom}` : ''
    operations.push({
      id: `prestation-${p.id}`,
      type_ligne: 'prestation_materiel',
      campagne: `Facture Prestation : ${p.type_prestation}${matNom}${campNom}`,
      date: p.date_prestation || p.created_at,
      montant_facture: montant,
      montant_paye: 0,
      montant_ristourne: 0,
      raw: { ...p, membre },
    })
  }

  for (const s of sortiesStockRes.data || []) {
    const camp = Array.isArray(s.campagnes) ? s.campagnes[0] : s.campagnes
    const montant = Number(s.quantite || 0) * Number(s.prix_unitaire || 0)
    const prod = camp?.produit_collecte || 'Stock'

    if (s.type_sortie === 'ristourne') {
      operations.push({
        id: `ristourne-nature-${s.id}`,
        type_ligne: 'ristourne_nature',
        campagne: `Ristourne en nature : ${prod} (${s.quantite} kg)${camp?.nom ? ` · ${camp.nom}` : ''}${s.motif ? ` — ${s.motif}` : ''}`,
        date: s.date_sortie,
        montant_facture: 0,
        montant_paye: 0,
        montant_ristourne: montant,
      })
    } else {
      operations.push({
        id: `vente-${s.id}`,
        type_ligne: 'vente_stock',
        campagne: `Facture Vente Stock : ${prod} (${s.quantite} kg)${camp?.nom ? ` · ${camp.nom}` : ''}`,
        date: s.date_sortie,
        montant_facture: montant,
        montant_paye: 0,
        montant_ristourne: 0,
        raw: { ...s, membre, campagne: camp },
      })
    }
  }

  for (const r of ristournesRes.data || []) {
    const compte = Array.isArray((r as any).comptes) ? (r as any).comptes[0] : (r as any).comptes
    const montant = Number(r.montant || 0)
    operations.push({
      id: `ristourne-num-${r.id}`,
      type_ligne: 'ristourne_numeraire',
      campagne: `Ristourne versée (Surplus rendu)${compte?.nom ? ` · ${compte.nom}` : ''}${r.motif ? ` — ${r.motif}` : ''}`,
      date: r.date_ristourne || r.created_at,
      montant_facture: 0,
      montant_paye: 0,
      montant_ristourne: montant,
    })
  }

  operations.sort((a, b) => {
    const ta = a.date ? new Date(a.date).getTime() : 0
    const tb = b.date ? new Date(b.date).getTime() : 0
    return ta - tb
  })

  for (const op of operations) {
    // Une ristourne restitue le surplus au membre : elle augmente le solde (réduit le surplus négatif vers 0)
    solde += op.montant_facture - op.montant_paye + Number(op.montant_ristourne || 0)
    lignes.push({
      ...op,
      solde_progressif: solde,
    })
  }

  return { membre, lignes, soldeFinal: solde, soldeInitial }
}

export async function getFicheMembre(membreId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non authentifié" }

  const { data: membre } = await supabase
    .from('membres')
    .select('id, prenom, nom, code_membre, telephone, village, superficie, solde_initial, statut, created_at')
    .eq('id', membreId)
    .single()

  if (!membre) return { error: "Membre introuvable" }

  const [facturesRes, rembRes, prestationsRes, sortiesStockRes, ristournesRes] = await Promise.all([
    supabase
      .from('factures')
      .select('id, montant_total, montant_interet, montant_paye, statut, date_emission, created_at, campagnes(id, nom, date_debut, produit_collecte, prix_collecte)')
      .eq('membre_id', membreId)
      .order('date_emission', { ascending: true }),
    supabase
      .from('remboursements')
      .select('id, montant_fcfa, quantite_nature, produit_nature, date_paiement, created_at, type_remboursement, reference_piece, facture_id, comptes(nom)')
      .eq('membre_id', membreId)
      .order('date_paiement', { ascending: true }),
    supabase
      .from('materiel_prestations')
      .select('*, materiel:materiel_id(nom), produit:produit_id(nom), campagne:campagne_id(nom)')
      .order('date_prestation', { ascending: true }),
    supabase
      .from('sorties_stock_nature')
      .select('id, type_sortie, quantite, prix_unitaire, date_sortie, motif, campagnes(nom, produit_collecte)')
      .eq('membre_id', membreId)
      .eq('tiers_type', 'membre')
      .in('type_sortie', ['vente', 'ristourne'])
      .order('date_sortie', { ascending: true }),
    supabase
      .from('ristournes')
      .select('id, montant, date_ristourne, motif, created_at, comptes:compte_id(nom)')
      .eq('membre_id', membreId)
      .order('date_ristourne', { ascending: true }),
  ])

  if (facturesRes.error) return { error: facturesRes.error.message }

  const nomComplet1 = `${membre.prenom} ${membre.nom}`.trim().toLowerCase()
  const nomComplet2 = `${membre.nom} ${membre.prenom}`.trim().toLowerCase()

  const prestationsMembre = (prestationsRes.data || []).filter((p: any) => {
    if (p.membre_id) return p.membre_id === membreId
    if (p.tiers_type === 'client' && p.client_id) return false
    const cNom = String(p.client_nom || '').trim().toLowerCase()
    return cNom !== '' && (cNom === nomComplet1 || cNom === nomComplet2)
  })

  // Grand livre chronologique
  type JournalEntry = {
    id: string
    date: string
    type: 'solde_initial' | 'facture' | 'remboursement' | 'prestation' | 'vente_stock' | 'ristourne_numeraire' | 'ristourne_nature'
    libelle: string
    debit: number
    credit: number
    soldeLigne?: number
    raw?: any
  }

  const journal: JournalEntry[] = []

  const soldeInitial = Number(membre.solde_initial || 0)
  if (soldeInitial !== 0) {
    journal.push({
      id: 'solde-initial',
      date: membre.created_at || new Date().toISOString(),
      type: 'solde_initial',
      libelle: 'Solde initial (Report à nouveau)',
      debit: soldeInitial > 0 ? soldeInitial : 0,
      credit: soldeInitial < 0 ? Math.abs(soldeInitial) : 0,
    })
  }

  for (const f of facturesRes.data || []) {
    const campagne = Array.isArray(f.campagnes) ? f.campagnes[0] : f.campagnes
    const totalFacture = Number(f.montant_total || 0) + Number(f.montant_interet || 0)
    journal.push({
      id: `facture-${f.id}`,
      date: f.date_emission || f.created_at,
      type: 'facture',
      libelle: campagne?.nom ? `Facture Campagne — ${campagne.nom}` : 'Facture Campagne',
      debit: totalFacture,
      credit: 0,
      raw: { ...f, campagne },
    })
  }

  for (const r of rembRes.data || []) {
    const compte = Array.isArray((r as any).comptes) ? (r as any).comptes[0] : (r as any).comptes
    const isNature = r.type_remboursement === 'nature'
    const natureDesc = isNature ? ` (Pesée en nature : ${r.quantite_nature || 0} kg${r.produit_nature ? ` - ${r.produit_nature}` : ''})` : ''
    const compteDesc = compte?.nom ? ` · Compte ${compte.nom}` : ''
    journal.push({
      id: `remb-${r.id}`,
      date: r.date_paiement || r.created_at,
      type: 'remboursement',
      libelle: `Remboursement ${r.type_remboursement || 'numéraire'}${natureDesc}${compteDesc}`,
      debit: 0,
      credit: Number(r.montant_fcfa || 0),
      raw: r,
    })
  }

  for (const p of prestationsMembre) {
    const montant = Number(p.montant_facture || 0)
    const matNom = p.materiel?.nom ? ` (${p.materiel.nom})` : ''
    const campNom = p.campagne?.nom ? ` · ${p.campagne.nom}` : ''
    journal.push({
      id: `prestation-${p.id}`,
      date: p.date_prestation || p.created_at,
      type: 'prestation',
      libelle: `Facture Prestation : ${p.type_prestation}${matNom}${campNom}`,
      debit: montant,
      credit: 0,
      raw: p,
    })
  }

  for (const s of sortiesStockRes.data || []) {
    const camp = Array.isArray(s.campagnes) ? s.campagnes[0] : s.campagnes
    const montant = Number(s.quantite || 0) * Number(s.prix_unitaire || 0)
    const prod = camp?.produit_collecte || 'Stock'

    if (s.type_sortie === 'ristourne') {
      journal.push({
        id: `ristourne-nature-${s.id}`,
        date: s.date_sortie,
        type: 'ristourne_nature',
        libelle: `Ristourne en nature (Surplus restitué) : ${prod} (${s.quantite} kg)${s.motif ? ` — ${s.motif}` : ''}`,
        debit: montant,
        credit: 0,
        raw: s,
      })
    } else {
      journal.push({
        id: `vente-${s.id}`,
        date: s.date_sortie,
        type: 'vente_stock',
        libelle: `Facture Vente Stock : ${prod} (${s.quantite} kg)`,
        debit: montant,
        credit: 0,
        raw: s,
      })
    }
  }

  for (const r of ristournesRes.data || []) {
    const compte = Array.isArray((r as any).comptes) ? (r as any).comptes[0] : (r as any).comptes
    const montant = Number(r.montant || 0)
    journal.push({
      id: `ristourne-num-${r.id}`,
      date: r.date_ristourne || r.created_at,
      type: 'ristourne_numeraire',
      libelle: `Ristourne versée (Surplus rendu)${compte?.nom ? ` · ${compte.nom}` : ''}${r.motif ? ` — ${r.motif}` : ''}`,
      debit: montant,
      credit: 0,
      raw: r,
    })
  }

  // Trier chronologiquement
  journal.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Calcul du solde progressif
  let soldeProgressif = 0
  const journalWithSolde = journal.map((item) => {
    soldeProgressif += item.debit - item.credit
    return {
      ...item,
      soldeLigne: soldeProgressif,
    }
  })

  // KPIs
  const totalFacture = journal.reduce((sum, item) => sum + item.debit, 0)
  const totalPaye = journal.reduce((sum, item) => sum + item.credit, 0)
  const soldeActuel = soldeProgressif

  return {
    membre,
    factures: facturesRes.data || [],
    remboursements: rembRes.data || [],
    prestations: prestationsMembre,
    ristournes: ristournesRes.data || [],
    sortiesStock: sortiesStockRes.data || [],
    journal: journalWithSolde,
    kpi: {
      totalFacture,
      totalPaye,
      soldeActuel,
      nbFactures: facturesRes.data?.length || 0,
      nbRemboursements: rembRes.data?.length || 0,
    }
  }
}

