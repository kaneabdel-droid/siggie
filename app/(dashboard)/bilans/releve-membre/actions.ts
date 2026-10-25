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

  const [facturesRes, prestationsRes, ventesStockRes] = await Promise.all([
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
      .select('id, quantite, prix_unitaire, date_sortie, motif, campagnes(nom, produit_collecte)')
      .eq('membre_id', membreId)
      .eq('tiers_type', 'membre')
      .eq('type_sortie', 'vente')
      .order('date_sortie', { ascending: true }),
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
      solde_progressif: soldeInitial,
    })
  }

  type OperationMembre = {
    id: string
    type_ligne: 'facture_campagne' | 'prestation_materiel' | 'vente_stock'
    campagne: string
    date: string | null
    montant_facture: number
    montant_paye: number
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
      raw: { ...p, membre },
    })
  }

  for (const v of ventesStockRes.data || []) {
    const camp = Array.isArray(v.campagnes) ? v.campagnes[0] : v.campagnes
    const montant = Number(v.quantite || 0) * Number(v.prix_unitaire || 0)
    const prod = camp?.produit_collecte || 'Stock'
    operations.push({
      id: `vente-${v.id}`,
      type_ligne: 'vente_stock',
      campagne: `Facture Vente Stock : ${prod} (${v.quantite} kg)${camp?.nom ? ` · ${camp.nom}` : ''}`,
      date: v.date_sortie,
      montant_facture: montant,
      montant_paye: 0,
      raw: { ...v, membre, campagne: camp },
    })
  }

  operations.sort((a, b) => {
    const ta = a.date ? new Date(a.date).getTime() : 0
    const tb = b.date ? new Date(b.date).getTime() : 0
    return ta - tb
  })

  for (const op of operations) {
    solde += op.montant_facture - op.montant_paye
    lignes.push({
      ...op,
      solde_progressif: solde,
    })
  }

  return { membre, lignes, soldeFinal: solde, soldeInitial }
}
