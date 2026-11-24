import { createClient } from '@/utils/supabase/client'
import { getSpeculationsCampagne } from '@/app/(dashboard)/campagnes/[id]/speculations/actions'
import { extraireParcellesObservations, extraireTagSpeculation } from '@/lib/speculations'
import { getCreditSpeculationId, getCreditSpeculationNom } from '@/lib/credits-types'
import { getFactureItemRank } from '@/lib/intrants/types'

// Formatage propre des montants sans espaces insécables qui posent problème à jsPDF
export const formatFactureAmount = (amount: number | undefined | null) => {
  if (!amount) return '0'
  return Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

/**
 * Nettoie et standardise un numéro pour WhatsApp.
 * Gère notamment les numéros sénégalais (ex: 77 123 45 67 -> 221771234567).
 */
export function formatWhatsAppPhone(phone: string | null | undefined): {
  cleanPhone: string
  isValid: boolean
  displayPhone: string
} {
  if (!phone) return { cleanPhone: '', isValid: false, displayPhone: '' }
  let clean = phone.trim()
  if (clean.startsWith('+')) {
    clean = clean.substring(1)
  } else if (clean.startsWith('00')) {
    clean = clean.substring(2)
  }
  clean = clean.replace(/[^0-9]/g, '')

  // Si numéro sénégalais à 9 chiffres commençant par 70, 75, 76, 77, 78, 33, 30
  if (clean.length === 9 && /^(70|75|76|77|78|33|30)/.test(clean)) {
    clean = '221' + clean
  }

  const isValid = clean.length >= 8 && clean.length <= 15
  return {
    cleanPhone: clean,
    isValid,
    displayPhone: phone.trim(),
  }
}

/**
 * Génère le texte formaté pour WhatsApp avec émojis et mise en page adaptée.
 * Inclut le détail par spéculation et le récapitulatif consolidé par intrant.
 */
export function buildFactureWhatsAppText({
  facture,
  gieName,
  unite = 'FCFA',
  distributions = [],
  credits = [],
  speculations = [],
  memberParcelles = [],
  remboursementsParSpeculation = [],
}: {
  facture: any
  gieName: string
  unite?: string
  distributions?: any[]
  credits?: any[]
  speculations?: any[]
  memberParcelles?: any[]
  remboursementsParSpeculation?: any[]
}): string {
  if (facture?.type_document === 'prestation') {
    return buildPrestationWhatsAppText({
      prestation: facture.raw || facture,
      gieName,
      unite,
    })
  }
  if (facture?.type_document === 'vente_stock') {
    return buildVenteStockWhatsAppText({
      vente: facture.raw || facture,
      gieName,
      unite,
    })
  }

  const nomMembre = `${facture.membre?.prenom || ''} ${facture.membre?.nom || ''}`.trim() || 'Membre'
  const codeMembre = facture.membre?.code_membre
  const village = facture.membre?.village
  const nomCampagne = facture.campagne?.nom || 'N/A'
  const idCourt = (facture.id || '').substring(0, 8).toUpperCase()
  const unitStr = unite ? ` ${unite.trim()}` : ' FCFA'

  const targetSpecId = facture.filterSpeculationId || (facture as any).filterSpecId || null
  let targetNom = ''
  let targetParcelle: any = null
  const allMemberParcelles = memberParcelles || []
  const totalAllSuperficie = allMemberParcelles.reduce((sum: number, p: any) => sum + (Number(p.superficie) || 0), 0)

  if (targetSpecId) {
    targetParcelle = allMemberParcelles.find((p: any) => p.speculationId === targetSpecId)
    if (targetParcelle) {
      targetNom = targetParcelle.nom
    } else {
      const sObj = (speculations || []).find((s: any) => s.id === targetSpecId)
      if (sObj) targetNom = sObj.nom
    }
  }

  const ratio = (targetSpecId && totalAllSuperficie > 0 && targetParcelle)
    ? Number(targetParcelle.superficie || 0) / totalAllSuperficie
    : 1

  // 1. Liste des intrants reçus (chaque intrant sur une ligne avec Qté, Prix et Montant)
  const itemsLines: string[] = []
  let totalFournitures = 0

  if (distributions && distributions.length > 0) {
    const grouped = new Map<string, {
      nom: string
      type: string
      totalQte: number
      totalMontant: number
    }>()

    distributions.forEach((d: any) => {
      if (targetSpecId && (d as any).speculation_id && (d as any).speculation_id !== targetSpecId) return
      const intrant = Array.isArray(d.intrants) ? d.intrants[0] : d.intrants
      if (!intrant?.nom) return

      const prix = Number(d.prix_facturation ?? intrant.prix_facturation ?? (intrant.prix_unitaire || 0))
      let qte = Number(d.quantite || 0)

      if (targetSpecId && !(d as any).speculation_id) {
        qte = Math.round(qte * ratio * 100) / 100
      }
      if (qte <= 0) return

      const key = intrant.id || intrant.nom
      if (!grouped.has(key)) {
        grouped.set(key, {
          nom: intrant.nom,
          type: intrant.type_intrant || 'Intrant',
          totalQte: 0,
          totalMontant: 0,
        })
      }
      const item = grouped.get(key)!
      item.totalQte += qte
      item.totalMontant += qte * prix
    })

    // Tri croissant par article dans l'ordre de leur type :
    // Façon cultural -> Service hydraulique -> Semences -> Engrais -> Produits phytosanitaires -> Refacturation -> Autres
    const sortedItems = Array.from(grouped.values()).sort((a, b) => {
      const rankA = getFactureItemRank(a.type, a.nom)
      const rankB = getFactureItemRank(b.type, b.nom)
      if (rankA !== rankB) return rankA - rankB
      return a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' })
    })

    sortedItems.forEach((item) => {
      totalFournitures += item.totalMontant
      const prixMoyen = item.totalQte > 0 ? Math.round(item.totalMontant / item.totalQte) : 0
      itemsLines.push(`• ${item.nom} : ${item.totalQte.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} x ${formatFactureAmount(prixMoyen)} = *${formatFactureAmount(item.totalMontant)}${unitStr}*`)
    })
  }

  // 2. Crédits de campagne
  if (credits && credits.length > 0) {
    credits.forEach((c: any) => {
      if (targetSpecId) {
        const sId = getCreditSpeculationId(c)
        const sNom = getCreditSpeculationNom(c)
        if (sId && sId !== targetSpecId) return
        if (!sId && sNom && targetNom && sNom.toLowerCase() !== targetNom.toLowerCase()) return
      }
      const but = c.but_credit || 'Crédit de campagne'
      const m = Number(c.montant_demande || c.montant_accorde || 0)
      totalFournitures += m
      itemsLines.push(`• Crédit ${but} : *${formatFactureAmount(m)}${unitStr}*`)
    })
  }

  // 3. Calculs financiers (Intérêts, Total Facturé, Acomptes, Restant à rembourser)
  let montantInteret = 0
  let totalDu = 0
  let montantPaye = 0
  let resteAPayer = 0

  const rembList = remboursementsParSpeculation || facture.remboursements_par_speculation || []
  if (targetSpecId) {
    const spRemb = rembList.find((s: any) => s.speculation_id === targetSpecId)
    if (spRemb) {
      totalDu = Number(spRemb.montant_du || 0)
      montantPaye = Number(spRemb.montant_rembourse || 0)
      resteAPayer = Number(spRemb.solde || 0)
      montantInteret = Math.max(0, totalDu - totalFournitures)
    } else {
      montantInteret = Math.round(Number(facture.montant_interet || 0) * ratio)
      totalDu = totalFournitures + montantInteret
      montantPaye = Math.round(Number(facture.montant_paye || 0) * ratio)
      resteAPayer = totalDu - montantPaye
    }
  } else {
    montantInteret = Number(facture.montant_interet || 0)
    totalDu = totalFournitures + montantInteret
    if (Number(facture.montant_total || 0) > 0 && Math.abs(totalFournitures - Number(facture.montant_total)) > 50) {
      totalDu = (Number(facture.montant_total) || totalFournitures) + montantInteret
    }
    montantPaye = Number(facture.montant_paye || 0)
    resteAPayer = totalDu - montantPaye
  }

  // Prix de collecte & équivalent nature (uniquement pour la facture par spéculation)
  const prixCollecte = targetSpecId
    ? Number(targetParcelle?.prixCollecte || 0) || Number(facture.campagne?.prix_collecte || 0)
    : 0
  const produitCollecte = targetSpecId
    ? (targetParcelle?.produitCollecte || targetNom || 'récolte')
    : ''
  const uniteMesure = targetSpecId
    ? (targetParcelle?.uniteMesure || 'kg')
    : 'kg'

  let quantiteNature = ''
  if (targetSpecId && prixCollecte > 0 && resteAPayer > 0) {
    quantiteNature = `${(resteAPayer / prixCollecte).toFixed(1)} ${uniteMesure} de ${produitCollecte}`
  }

  // Titre
  const docTitle = targetSpecId && targetNom
    ? `*FACTURE ${targetNom.toUpperCase()} N° ${idCourt}*`
    : `*FACTURE N° ${idCourt}*`

  let statutMsg = ''
  if (facture.statut === 'payee' || resteAPayer <= 0) {
    statutMsg = `✅ *STATUT : FACTURE SOLDÉE / PAYÉE*`
    if (resteAPayer < 0) {
      statutMsg += `\n💚 *Surplus de remboursement : +${formatFactureAmount(Math.abs(resteAPayer))}${unitStr}*`
    }
  } else if (facture.statut === 'partiellement_paye' || montantPaye > 0) {
    statutMsg = `⏳ *STATUT : PARTIELLEMENT PAYÉE*\n👉 *RESTANT À REMBOURSER : ${formatFactureAmount(resteAPayer)}${unitStr}*`
  } else {
    statutMsg = `⚠️ *STATUT : EN ATTENTE DE RÈGLEMENT*\n👉 *RESTANT À REMBOURSER : ${formatFactureAmount(resteAPayer)}${unitStr}*`
  }

  let natureBlock = ''
  if (quantiteNature && resteAPayer > 0) {
    natureBlock = `\n⚖️ *Règlement en nature possible :*\n• Équivalent : *${quantiteNature}*\n  (sur la base de ${formatFactureAmount(prixCollecte)}${unitStr}/${uniteMesure})\n`
  }

  let detailsBlock = ''
  if (itemsLines.length > 0) {
    detailsBlock = `━━━━━━━━━━━━━━━━━━━\n📦 *INTRANTS & CRÉDITS REÇUS*\n━━━━━━━━━━━━━━━━━━━\n${itemsLines.join('\n')}\n\n`
  }

  let acomptesLine = ''
  if (montantPaye > 0) {
    acomptesLine = `• Acomptes / Versements reçus : -${formatFactureAmount(montantPaye)}${unitStr}\n`
  }

  return (
`${docTitle}
🏛️ *${gieName.toUpperCase()}*
───────────────────
👤 *Membre :* ${nomMembre}${codeMembre ? ` (${codeMembre})` : ''}
${village ? `📍 *Village :* ${village}\n` : ''}🌱 *Campagne :* ${nomCampagne}
${targetSpecId && targetNom ? `🌾 *Culture :* ${targetNom}${targetParcelle?.superficie ? ` (${Number(targetParcelle.superficie).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ha)` : ''}\n` : ''}📅 *Date d'émission :* ${new Date().toLocaleDateString('fr-FR')}

${detailsBlock}━━━━━━━━━━━━━━━━━━━
📊 *DÉCOMPTE FINANCIER*
━━━━━━━━━━━━━━━━━━━
• ${credits && credits.length > 0 ? 'Total Intrants & Crédits' : 'Total Intrants'} : ${formatFactureAmount(totalFournitures)}${unitStr}
${montantInteret > 0 ? `• Intérêts de campagne : ${formatFactureAmount(montantInteret)}${unitStr}\n` : ''}• *TOTAL FACTURÉ :* ${formatFactureAmount(totalDu)}${unitStr}
${acomptesLine}───────────────────
${statutMsg}
${natureBlock}
━━━━━━━━━━━━━━━━━━━
Merci de vous rapprocher de la trésorerie du GIE pour toute régularisation.
_Message généré par SIGGIE_`
  )
}

/**
 * Génère le document jsPDF et retourne les données associées (blob, file, etc.).
 * Imprimé individuel au format standard SIGGIE (tableau unique des intrants et crédits,
 * décompte financier avec intérêts/acomptes/solde, équivalent nature et filtre culture).
 */
export async function generateFacturePdf({
  facture,
  gieName,
  unite = 'FCFA',
  supabaseClient,
}: {
  facture: any
  gieName: string
  unite?: string
  supabaseClient?: any
}) {
  if (facture?.type_document === 'prestation') {
    return generatePrestationPdf({
      prestation: facture.raw || facture,
      gieName,
      unite,
    })
  }
  if (facture?.type_document === 'vente_stock') {
    return generateVenteStockPdf({
      vente: facture.raw || facture,
      gieName,
      unite,
    })
  }

  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const supabase = supabaseClient || createClient()
  const membreId = facture.membre?.id || facture.membre_id
  const campagneId = facture.campagne?.id || facture.campagne_id

  let distributions: any[] = []
  let credits: any[] = []
  let speculations: any[] = []
  let remboursementsList: any[] = []
  let memberParcelles: Array<{
    speculationId: string
    nom: string
    variete?: string | null
    superficie: number
    casier?: string | null
    prixCollecte: number
    produitCollecte?: string | null
    uniteMesure: string
  }> = []
  let membreDetails: any = facture.membre

  if (membreId && campagneId) {
    if (!membreDetails?.village || !membreDetails?.telephone) {
      const { data: mData } = await supabase.from('membres').select('*').eq('id', membreId).maybeSingle()
      if (mData) membreDetails = mData
    }

    const [distRes, ciRes, cmRes, specList, creditsRes, rembRes] = await Promise.all([
      supabase
        .from('distribution_intrants')
        .select(`
          id,
          intrant_id,
          quantite,
          intrants (id, nom, type_intrant, prix_unitaire)
        `)
        .eq('membre_id', membreId)
        .eq('campagne_id', campagneId),
      supabase
        .from('campagne_intrants')
        .select('intrant_id, prix_facturation')
        .eq('campagne_id', campagneId),
      supabase
        .from('campagne_membres')
        .select('superficie, superficie_validee, casier, observations')
        .eq('campagne_id', campagneId)
        .eq('membre_id', membreId)
        .maybeSingle(),
      getSpeculationsCampagne(campagneId).catch(() => []),
      supabase
        .from('credits')
        .select('id, montant_demande, montant_accorde, but_credit, membre_id')
        .eq('campagne_id', campagneId),
      supabase
        .from('remboursements')
        .select('*')
        .eq('facture_id', facture.id),
    ])

    speculations = specList || []

    const prixFacturationMap = new Map<string, number>()
    if (ciRes?.data) {
      ciRes.data.forEach((ci: any) => {
        prixFacturationMap.set(ci.intrant_id, Number(ci.prix_facturation) || 0)
      })
    }

    if (distRes?.data) {
      distributions = distRes.data.map((d: any) => {
        const intrant = Array.isArray(d.intrants) ? d.intrants[0] : d.intrants
        const prixFacturation = prixFacturationMap.has(d.intrant_id)
          ? prixFacturationMap.get(d.intrant_id)!
          : Number(intrant?.prix_unitaire || 0)

        return {
          ...d,
          prix_facturation: prixFacturation,
          intrants: intrant
            ? {
              ...intrant,
              prix_facturation: prixFacturation,
            }
            : intrant,
        }
      })
    }

    // Crédits accordés au membre
    if (creditsRes?.data) {
      credits = creditsRes.data.filter((c: any) => !c.membre_id || c.membre_id === membreId)
    }

    if (rembRes?.data) {
      remboursementsList = rembRes.data
    }

    // Récupération des parcelles du membre depuis les observations
    const rawParcelles = extraireParcellesObservations(cmRes?.data?.observations)

    if (rawParcelles && rawParcelles.length > 0) {
      memberParcelles = rawParcelles
        .filter((p: any) => Number(p.superficie || 0) > 0)
        .map((p: any) => {
          const sObj = speculations.find((s: any) => s.id === p.speculation_id)
          return {
            speculationId: p.speculation_id,
            nom: sObj?.nom || 'Culture',
            variete: sObj?.variete || null,
            superficie: Number(p.superficie || 0),
            casier: p.casier || cmRes?.data?.casier || null,
            prixCollecte: Number(sObj?.prix_collecte || 0),
            produitCollecte: sObj?.produit_collecte || sObj?.nom || null,
            uniteMesure: sObj?.unite_mesure || 'kg',
          }
        })
    }

    // Repli si pas de découpage détaillé
    const supGlobale = Number(cmRes?.data?.superficie || 0)
    if (memberParcelles.length === 0 && (supGlobale > 0 || speculations.length > 0)) {
      const defSpec = speculations[0]
      memberParcelles = [
        {
          speculationId: defSpec?.id || 'default',
          nom: defSpec?.nom || facture.campagne?.nom || 'Culture principale',
          variete: defSpec?.variete || null,
          superficie: supGlobale > 0 ? supGlobale : 1,
          casier: cmRes?.data?.casier || null,
          prixCollecte: Number(defSpec?.prix_collecte || facture.campagne?.prix_collecte || 0),
          produitCollecte: defSpec?.produit_collecte || facture.campagne?.produit_collecte || 'Produit',
          uniteMesure: defSpec?.unite_mesure || 'kg',
        },
      ]
    }
  }

  const targetSpecId = facture.filterSpeculationId || (facture as any).filterSpecId || null
  let targetNom = ''
  let targetParcelle: any = null
  const allMemberParcelles = [...memberParcelles]
  const totalAllSuperficie = allMemberParcelles.reduce((sum, p) => sum + (Number(p.superficie) || 0), 0)

  if (targetSpecId) {
    targetParcelle = allMemberParcelles.find((p: any) => p.speculationId === targetSpecId)
    if (targetParcelle) {
      targetNom = targetParcelle.nom
    } else {
      const sObj = speculations.find((s: any) => s.id === targetSpecId)
      if (sObj) targetNom = sObj.nom
    }
  }

  const ratio = (targetSpecId && totalAllSuperficie > 0 && targetParcelle)
    ? Number(targetParcelle.superficie || 0) / totalAllSuperficie
    : 1

  // 1. Tableau unique des intrants et crédits reçus par le membre (chaque intrant sur une ligne)
  const tableBody: any[] = []
  let totalFournitures = 0

  if (distributions && distributions.length > 0) {
    const grouped = new Map<string, {
      nom: string
      type: string
      totalQte: number
      totalMontant: number
    }>()

    distributions.forEach((d: any) => {
      if (targetSpecId && (d as any).speculation_id && (d as any).speculation_id !== targetSpecId) return
      const intrant = Array.isArray(d.intrants) ? d.intrants[0] : d.intrants
      if (!intrant?.nom) return

      const prix = Number(d.prix_facturation ?? intrant.prix_facturation ?? (intrant.prix_unitaire || 0))
      let qte = Number(d.quantite || 0)

      if (targetSpecId && !(d as any).speculation_id) {
        qte = Math.round(qte * ratio * 100) / 100
      }
      if (qte <= 0) return

      const key = intrant.id || intrant.nom
      if (!grouped.has(key)) {
        grouped.set(key, {
          nom: intrant.nom,
          type: intrant.type_intrant || 'Intrant',
          totalQte: 0,
          totalMontant: 0,
        })
      }
      const item = grouped.get(key)!
      item.totalQte += qte
      item.totalMontant += qte * prix
    })

    // Tri croissant par article dans l'ordre de leur type :
    // Façon cultural -> Service hydraulique -> Semences -> Engrais -> Produits phytosanitaires -> Refacturation -> Autres
    const sortedItems = Array.from(grouped.values()).sort((a, b) => {
      const rankA = getFactureItemRank(a.type, a.nom)
      const rankB = getFactureItemRank(b.type, b.nom)
      if (rankA !== rankB) return rankA - rankB
      return a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' })
    })

    sortedItems.forEach((item) => {
      totalFournitures += item.totalMontant
      const prixMoyen = item.totalQte > 0 ? Math.round(item.totalMontant / item.totalQte) : 0
      tableBody.push([
        item.nom,
        item.totalQte.toLocaleString('fr-FR', { maximumFractionDigits: 2 }),
        formatFactureAmount(prixMoyen),
        formatFactureAmount(item.totalMontant),
      ])
    })
  }

  if (credits && credits.length > 0) {
    credits.forEach((c: any) => {
      if (targetSpecId) {
        const sId = getCreditSpeculationId(c)
        const sNom = getCreditSpeculationNom(c)
        if (sId && sId !== targetSpecId) return
        if (!sId && sNom && targetNom && sNom.toLowerCase() !== targetNom.toLowerCase()) return
      }
      const but = c.but_credit || 'Crédit de campagne'
      const m = Number(c.montant_demande || c.montant_accorde || 0)
      totalFournitures += m
      tableBody.push([
        `Crédit : ${but}`,
        '-',
        '-',
        formatFactureAmount(m),
      ])
    })
  }

  if (tableBody.length === 0) {
    const fallbackTotal = targetSpecId ? Math.round(Number(facture.montant_total || 0) * ratio) : Number(facture.montant_total || 0)
    totalFournitures = fallbackTotal
    tableBody.push([
      targetSpecId && targetNom ? `Fournitures & Crédits (${targetNom})` : 'Fournitures & Crédits de la campagne',
      '-',
      '-',
      formatFactureAmount(fallbackTotal),
    ])
  }

  // 2. Calculs financiers
  let montantInteret = 0
  let totalDu = 0
  let montantPaye = 0
  let resteAPayer = 0

  const rembList = facture.remboursements_par_speculation || []
  if (targetSpecId) {
    const spRemb = rembList.find((s: any) => s.speculation_id === targetSpecId)
    if (spRemb) {
      totalDu = Number(spRemb.montant_du || 0)
      montantPaye = Number(spRemb.montant_rembourse || 0)
      resteAPayer = Number(spRemb.solde || 0)
      montantInteret = Math.max(0, totalDu - totalFournitures)
    } else {
      montantInteret = Math.round(Number(facture.montant_interet || 0) * ratio)
      totalDu = totalFournitures + montantInteret
      montantPaye = Math.round(Number(facture.montant_paye || 0) * ratio)
      resteAPayer = totalDu - montantPaye
    }
  } else {
    montantInteret = Number(facture.montant_interet || 0)
    totalDu = totalFournitures + montantInteret
    if (Number(facture.montant_total || 0) > 0 && Math.abs(totalFournitures - Number(facture.montant_total)) > 50) {
      totalDu = (Number(facture.montant_total) || totalFournitures) + montantInteret
    }
    montantPaye = Number(facture.montant_paye || 0)
    resteAPayer = totalDu - montantPaye
  }

  // Document PDF
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const nomMembre = `${membreDetails?.prenom || ''} ${membreDetails?.nom || ''}`.trim() || 'Membre'
  const nomCampagne = facture.campagne?.nom || 'N/A'

  // En-tête officiel
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(45, 106, 79)
  const gieLines = doc.splitTextToSize(gieName, 115)
  doc.text(gieLines, 14, gieLines.length > 1 ? 22 : 27)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(targetSpecId && targetNom ? 14 : 20)
  doc.setTextColor(160, 160, 160)
  doc.text(targetSpecId && targetNom ? `FACTURE - ${targetNom.toUpperCase()}` : 'FACTURE', pageWidth - 14, 27, { align: 'right' })

  // Ligne de séparation
  doc.setDrawColor(45, 106, 79)
  doc.setLineWidth(0.5)
  doc.line(14, 38, pageWidth - 14, 38)

  // Informations Facture (gauche)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(0, 0, 0)
  doc.text('Informations de la facture :', 14, 45)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(70, 70, 70)
  doc.text(`N° Facture : ${(facture.id || '').substring(0, 8).toUpperCase()}`, 14, 50)
  doc.text(`Date d'émission : ${new Date().toLocaleDateString('fr-FR')}`, 14, 54.5)
  doc.text(`Campagne : ${nomCampagne}`, 14, 59)
  if (targetSpecId && targetNom) {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(35, 90, 65)
    doc.text(`Culture : ${targetNom}${targetParcelle?.superficie ? ` (${Number(targetParcelle.superficie).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ha)` : ''}`, 14, 63.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(70, 70, 70)
  }

  // Facturé à (Client - droite)
  doc.setFillColor(245, 247, 250)
  doc.roundedRect(pageWidth - 92, 42, 78, 22, 1.5, 1.5, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(0, 0, 0)
  doc.text('Facturé à :', pageWidth - 87, 47)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(45, 106, 79)
  doc.text(nomMembre.toUpperCase(), pageWidth - 87, 52)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(70, 70, 70)
  doc.text(`Village : ${membreDetails?.village || 'Non renseigné'}`, pageWidth - 87, 56.5)
  if (membreDetails?.telephone) {
    doc.text(`Tél : ${membreDetails.telephone}`, pageWidth - 87, 60.5)
  }

  // Le bandeau précédent a été retiré conformément aux consignes.
  const nextY = 70

  // TABLEAU UNIQUE : DÉTAIL DES ARTICLES & FOURNITURES
  autoTable(doc, {
    startY: nextY,
    head: [[
      targetSpecId && targetNom
        ? `DÉSIGNATION DE L'ARTICLE (Culture : ${targetNom.toUpperCase()})`
        : "DÉSIGNATION DE L'ARTICLE",
      "Qté",
      "Prix (moyen)",
      unite ? `Montant (${unite.trim()})` : "Montant",
    ]],
    body: tableBody,
    theme: 'striped',
    headStyles: {
      fillColor: [45, 106, 79],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 2.5,
      fontSize: 8.5,
    },
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 22 },
      2: { halign: 'right', cellWidth: 32 },
      3: { halign: 'right', cellWidth: 38, fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
  })

  // Récapitulatif financier
  const tableEndY = (doc as any).lastAutoTable?.finalY || 130
  const footerBlockHeight = 55
  let finalY = tableEndY
  if (finalY + footerBlockHeight > pageHeight) {
    doc.addPage()
    finalY = 15
  }

  // DÉCOMPTE FINANCIER (à droite)
  const totalBoxX = pageWidth - 88
  doc.setDrawColor(220, 220, 220)
  doc.line(totalBoxX, finalY + 5, pageWidth - 14, finalY + 5)

  let ty = finalY + 11
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(80, 80, 80)

  const labelFournitures = credits && credits.length > 0 ? 'Total Intrants & Crédits :' : 'Total Intrants :'
  doc.text(labelFournitures, totalBoxX, ty)
  doc.text(`${formatFactureAmount(totalFournitures)}`, pageWidth - 14, ty, { align: 'right' })
  ty += 5.5

  if (montantInteret > 0) {
    doc.text('Intérêts de campagne :', totalBoxX, ty)
    doc.text(`${formatFactureAmount(montantInteret)}`, pageWidth - 14, ty, { align: 'right' })
    ty += 5.5
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)
  doc.text('TOTAL FACTURÉ :', totalBoxX, ty)
  doc.text(`${formatFactureAmount(totalDu)} ${unite}`, pageWidth - 14, ty, { align: 'right' })
  ty += 5.5

  if (montantPaye > 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(45, 106, 79)
    doc.text('Avances / Acomptes reçus :', totalBoxX, ty)
    doc.text(`-${formatFactureAmount(montantPaye)} ${unite}`, pageWidth - 14, ty, { align: 'right' })
    ty += 4
  }

  // Ligne de solde
  doc.setDrawColor(45, 106, 79)
  doc.setLineWidth(0.5)
  doc.line(totalBoxX, ty, pageWidth - 14, ty)
  ty += 6

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  if (resteAPayer < 0) {
    doc.setTextColor(45, 106, 79)
    doc.text('SURPLUS DE REMB. :', totalBoxX, ty)
    doc.text(`+${formatFactureAmount(Math.abs(resteAPayer))} ${unite}`, pageWidth - 14, ty, { align: 'right' })
  } else if (resteAPayer === 0) {
    doc.setTextColor(45, 106, 79)
    doc.text('FACTURE SOLDÉE :', totalBoxX, ty)
    doc.text(`0 ${unite}`, pageWidth - 14, ty, { align: 'right' })
  } else {
    doc.setTextColor(220, 38, 38)
    doc.text('RESTANT À REMBOURSER :', totalBoxX, ty)
    doc.text(`${formatFactureAmount(resteAPayer)} ${unite}`, pageWidth - 14, ty, { align: 'right' })
  }

  // Calcul équivalent en nature : UNIQUEMENT pour la facture par spéculation (pas sur le récapitulatif multi-spéculations)
  let quantiteNatureStr = 'N/A'
  if (targetSpecId && targetParcelle && resteAPayer > 0) {
    const pCol = Number(targetParcelle.prixCollecte || facture.campagne?.prix_collecte || 0)
    const uMes = targetParcelle.uniteMesure || 'kg'
    const prodNom = targetParcelle.produitCollecte || targetNom || 'récolte'
    if (pCol > 0) {
      const qteNat = (resteAPayer / pCol).toFixed(1)
      quantiteNatureStr = `${qteNat} ${uMes} de ${prodNom}`
      ty += 4.5
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(45, 106, 79)
      doc.text(`(Soit en nature : ${quantiteNatureStr})`, pageWidth - 14, ty, { align: 'right' })
    }
  }

  // Signature Box (sur la gauche, séparée du décompte financier sur la droite)
  doc.setDrawColor(200, 200, 200)
  doc.setLineDashPattern([2, 2], 0)
  doc.rect(14, finalY + 11, 65, 24)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(80, 80, 80)
  doc.text('Cachet et Signature du GIE', 18, finalY + 16.5)

  // Mentions
  const mentionY = Math.max(ty + 6, finalY + 40)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7.5)
  doc.setTextColor(140, 140, 140)
  doc.text('Merci de conserver cette facture précieusement pour vos bilans.', 14, mentionY)

  // Footer sur la page
  doc.setLineDashPattern([], 0)
  doc.setDrawColor(230, 230, 230)
  doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14)
  doc.setFontSize(8)
  doc.setTextColor(140, 140, 140)
  doc.text('Généré par SIGGIE - Système Intégré de Gestion pour GIE', pageWidth / 2, pageHeight - 9, { align: 'center' })

  const safeNom = nomMembre.replace(/\s+/g, '_') || 'Facture'
  const specSuffix = targetSpecId && targetNom ? `_${targetNom.toLowerCase().replace(/[^a-z0-9]/g, '_')}` : ''
  const filename = `Facture_${(facture.id || '').substring(0, 8)}_${safeNom}${specSuffix}.pdf`
  const blob = doc.output('blob')
  const file = new File([blob], filename, { type: 'application/pdf' })

  return {
    doc,
    blob,
    file,
    filename,
    nomMembre,
    distributions,
    credits,
    speculations,
    memberParcelles: allMemberParcelles,
    intrantsConsolides: tableBody,
    specBreakdowns: [],
    remboursementsParSpeculation: facture.remboursements_par_speculation || [],
    totalDu,
    resteAPayer,
    quantiteNature: quantiteNatureStr,
  }
}

/**
 * Génère le texte formaté WhatsApp pour une Facture Prestation Matériel.
 */
export function buildPrestationWhatsAppText({
  prestation,
  gieName,
  unite = 'FCFA',
}: {
  prestation: any
  gieName: string
  unite?: string
}): string {
  const idCourt = String(prestation.id || '').replace(/^prestation-/, '').substring(0, 8).toUpperCase()
  const isMembre = prestation.tiers_type === 'membre' || Boolean(prestation.membre_id || prestation.membre?.id)
  const nomTiers =
    prestation.client_nom ||
    (prestation.membre ? `${prestation.membre.prenom || ''} ${prestation.membre.nom || ''}`.trim() : '') ||
    prestation.client?.nom ||
    'Client'
  const codeMembre = prestation.membre?.code_membre
  const typePrestation = prestation.type_prestation || 'Prestation agricole'
  const nomMateriel = prestation.materiel?.nom || 'Matériel du GIE'
  const nomCampagne = prestation.campagne?.nom || null
  const datePrestation = prestation.date_prestation
    ? new Date(prestation.date_prestation).toLocaleDateString('fr-FR')
    : new Date().toLocaleDateString('fr-FR')

  const qte = Number(prestation.quantite_traitee || prestation.superficie || 0)
  const uniteTravail = prestation.unite === 'autre' ? (prestation.unite_autre || 'unité') : (prestation.unite || 'ha')
  const montantFacture = Number(prestation.montant_facture || 0)
  const unitStr = unite ? ` ${unite.trim()}` : ' FCFA'

  let detailsRecolte = ''
  if (prestation.quantite_obtenue != null) {
    const prodNom = prestation.produit?.nom ? ` (${prestation.produit.nom})` : ''
    detailsRecolte += `\n• Quantité obtenue : ${prestation.quantite_obtenue} ${prestation.unite_obtenue || ''}${prodNom}`
    if (prestation.mode_paiement === 'part_recolte' && prestation.part_quantite != null) {
      detailsRecolte += `\n• Part GIE (${prestation.taux_part || 0}%) : ${prestation.part_quantite} ${prestation.unite_obtenue || ''}`
    }
  }

  const releveLabel = isMembre ? 'Relevé Membre' : 'Relevé Client'

  return (
`*FACTURE PRESTATION N° ${idCourt}*
🏛️ *${gieName.toUpperCase()}*
───────────────────
👤 *${isMembre ? 'Membre' : 'Client'} :* ${nomTiers}${codeMembre ? ` (${codeMembre})` : ''}
🚜 *Prestation :* ${typePrestation}
⚙️ *Équipement :* ${nomMateriel}
${nomCampagne ? `🌱 *Campagne :* ${nomCampagne}\n` : ''}📅 *Date :* ${datePrestation}

━━━━━━━━━━━━━━━━━━━
📊 *DÉTAIL DE LA PRESTATION*
━━━━━━━━━━━━━━━━━━━
• Travail réalisé : ${qte > 0 ? `${qte} ${uniteTravail}` : '-'}${detailsRecolte}
• *MONTANT FACTURÉ :* ${formatFactureAmount(montantFacture)}${unitStr}
───────────────────
📌 *Imputation comptable :* Intégré directement au *${releveLabel}*
━━━━━━━━━━━━━━━━━━━
Merci de votre confiance.
_Message généré par SIGGIE_`
  )
}

/**
 * Génère la facture PDF A4 pour une Prestation Matériel.
 */
export async function generatePrestationPdf({
  prestation,
  gieName,
  unite = 'FCFA',
}: {
  prestation: any
  gieName: string
  unite?: string
}) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const rawId = String(prestation.id || '').replace(/^prestation-/, '')
  const idCourt = rawId.substring(0, 8).toUpperCase() || 'PREST'
  const isMembre = prestation.tiers_type === 'membre' || Boolean(prestation.membre_id || prestation.membre?.id)
  const nomTiers =
    prestation.client_nom ||
    (prestation.membre ? `${prestation.membre.prenom || ''} ${prestation.membre.nom || ''}`.trim() : '') ||
    prestation.client?.nom ||
    (isMembre ? 'Membre du GIE' : 'Client externe')
  const telephone = prestation.client_telephone || prestation.membre?.telephone || prestation.client?.telephone || ''
  const codeMembre = prestation.membre?.code_membre || ''
  const dateStr = prestation.date_prestation
    ? new Date(prestation.date_prestation).toLocaleDateString('fr-FR')
    : new Date().toLocaleDateString('fr-FR')
  const nomCampagne = prestation.campagne?.nom || 'Hors campagne'
  const nomMateriel = prestation.materiel?.nom || 'Équipement du GIE'
  const typePrestation = prestation.type_prestation || 'Prestation matériel'
  const qte = Number(prestation.quantite_traitee || prestation.superficie || 0)
  const uniteTravail = prestation.unite === 'autre' ? (prestation.unite_autre || 'unité') : (prestation.unite || 'ha')
  const montantFacture = Number(prestation.montant_facture || 0)
  const tarifUnitaire =
    prestation.mode_paiement === 'part_recolte'
      ? Number(prestation.prix_unitaire_part || 0)
      : Number(prestation.tarif_unitaire || (qte > 0 ? montantFacture / qte : montantFacture))

  // Header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(45, 106, 79)
  const gieLinesPrest = doc.splitTextToSize(gieName, 105)
  doc.text(gieLinesPrest, 14, gieLinesPrest.length > 1 ? 22 : 27)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(45, 106, 79)
  doc.text('FACTURE PRESTATION', pageWidth - 14, 25, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(100, 100, 100)
  doc.text('Service & Équipement Agricole', pageWidth - 14, 31, { align: 'right' })

  doc.setDrawColor(45, 106, 79)
  doc.setLineWidth(0.5)
  doc.line(14, 40, pageWidth - 14, 40)

  // Infos Facture
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)
  doc.text('Informations de la prestation :', 14, 47)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  doc.text(`N° Facture : PREST-${idCourt}`, 14, 52)
  doc.text(`Date de réalisation : ${dateStr}`, 14, 57)
  doc.text(`Campagne : ${nomCampagne}`, 14, 62)
  doc.text(`Matériel utilisé : ${nomMateriel}`, 14, 67)

  // Facturé à
  doc.setFillColor(245, 247, 250)
  doc.roundedRect(pageWidth - 90, 44, 76, 25, 2, 2, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)
  doc.text(`Facturé à (${isMembre ? 'Membre GIE' : 'Client externe'}) :`, pageWidth - 85, 49)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(45, 106, 79)
  doc.text(nomTiers.toUpperCase(), pageWidth - 85, 55)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  if (codeMembre) {
    doc.text(`Code membre : ${codeMembre}`, pageWidth - 85, 60)
  } else {
    doc.text(`Catégorie : ${isMembre ? 'Membre du GIE' : 'Client Externe'}`, pageWidth - 85, 60)
  }
  if (telephone) {
    doc.text(`Tél : ${telephone}`, pageWidth - 85, 65)
  }

  const designationLines = [`${typePrestation} — ${nomMateriel}`]
  if (prestation.produit?.nom) {
    designationLines.push(`Culture / Produit : ${prestation.produit.nom}${prestation.variete ? ` (${prestation.variete})` : ''}`)
  }
  if (prestation.quantite_obtenue != null) {
    designationLines.push(`Récolte obtenue : ${prestation.quantite_obtenue} ${prestation.unite_obtenue || ''}`)
  }
  if (prestation.mode_paiement === 'part_recolte' && prestation.part_quantite != null) {
    designationLines.push(
      `Règlement en part de récolte (${prestation.taux_part || 0}%) : ${prestation.part_quantite} ${prestation.unite_obtenue || ''}`
    )
  }

  const tableBody = [
    [
      designationLines.join('\n'),
      qte > 0 ? `${qte} ${uniteTravail}` : '1',
      tarifUnitaire > 0 ? formatFactureAmount(tarifUnitaire) : '-',
      formatFactureAmount(montantFacture),
    ],
  ]

  autoTable(doc, {
    startY: 75,
    head: [['Désignation de la prestation', 'Quantité / Unité', 'Tarif Unitaire', unite ? `Montant (${unite.trim()})` : 'Montant']],
    body: tableBody,
    theme: 'striped',
    headStyles: {
      fillColor: [45, 106, 79],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 3,
    },
    styles: {
      font: 'helvetica',
      fontSize: 10,
      cellPadding: 3.5,
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 32 },
      2: { halign: 'right', cellWidth: 35 },
      3: { halign: 'right', cellWidth: 40, fontStyle: 'bold' },
    },
  })

  const finalY = ((doc as any).lastAutoTable?.finalY || 115) + 8
  const totalBoxX = pageWidth - 90

  doc.setDrawColor(45, 106, 79)
  doc.setLineWidth(0.5)
  doc.line(totalBoxX, finalY, pageWidth - 14, finalY)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(45, 106, 79)
  doc.text('MONTANT FACTURÉ :', totalBoxX, finalY + 8)
  doc.text(`${formatFactureAmount(montantFacture)} ${unite.trim()}`, pageWidth - 14, finalY + 8, { align: 'right' })

  // Imputation relevé
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(0, 0, 0)
  doc.text('Imputation comptable :', 14, finalY + 6)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(90, 90, 90)
  doc.text(
    `• Ce montant est imputé sur le ${isMembre ? 'Relevé Membre' : 'Relevé Client'} de ${nomTiers}.`,
    14,
    finalY + 12
  )
  doc.text(
    `• Mode de facturation : ${prestation.mode_paiement === 'part_recolte' ? 'Part sur la récolte' : 'Forfait / Tarif à l\'unité'}.`,
    14,
    finalY + 17
  )

  // Signature Box
  doc.setDrawColor(200, 200, 200)
  doc.setLineDashPattern([2, 2], 0)
  doc.rect(pageWidth - 70, finalY + 24, 56, 22)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.text('Cachet et Signature du GIE', pageWidth - 67, finalY + 29)

  // Footer
  doc.setLineDashPattern([], 0)
  doc.setDrawColor(230, 230, 230)
  doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15)
  doc.text('Généré par SIGGIE - Système Intégré de Gestion pour GIE', pageWidth / 2, pageHeight - 10, { align: 'center' })

  const safeNom = nomTiers.replace(/\s+/g, '_') || 'Client'
  const filename = `Facture_Prestation_${idCourt}_${safeNom}.pdf`
  const blob = doc.output('blob')
  const file = new File([blob], filename, { type: 'application/pdf' })

  return {
    doc,
    blob,
    file,
    filename,
    nomMembre: nomTiers,
    distributions: [],
    credits: [],
    totalDu: montantFacture,
    resteAPayer: montantFacture,
    quantiteNature: 'N/A',
  }
}

/**
 * Génère le texte formaté WhatsApp pour une Facture Vente de Stock.
 */
export function buildVenteStockWhatsAppText({
  vente,
  gieName,
  unite = 'FCFA',
}: {
  vente: any
  gieName: string
  unite?: string
}): string {
  const idCourt = String(vente.id || '').replace(/^vente-/, '').substring(0, 8).toUpperCase()
  const isMembre = vente.tiers_type === 'membre' || Boolean(vente.membre_id || vente.membre?.id)
  const nomTiers =
    vente.tiers_nom ||
    vente.tiers ||
    (vente.membre ? `${vente.membre.prenom || ''} ${vente.membre.nom || ''}`.trim() : '') ||
    vente.client?.nom ||
    'Client'
  const codeMembre = vente.membre?.code_membre
  const produit = vente.campagne?.produit_collecte || vente.produit_collecte || 'Produit agricole (Stock)'
  const nomCampagne = vente.campagne?.nom || null
  const dateVente = (vente.date_sortie || vente.date)
    ? new Date(vente.date_sortie || vente.date).toLocaleDateString('fr-FR')
    : new Date().toLocaleDateString('fr-FR')

  const quantite = Number(vente.quantite || 0)
  const prixUnitaire = Number(vente.prix_unitaire || 0)
  const montantTotal = Number(vente.montant_total || quantite * prixUnitaire)
  const unitStr = unite ? ` ${unite.trim()}` : ' FCFA'
  const releveLabel = isMembre ? 'Relevé Membre' : 'Relevé Client'
  const uVente = vente.unite_vente || vente.unite || 'kg'
  const nbCont = vente.nb_contenance ? ` (${vente.nb_contenance} sacs)` : ''

  return (
`*FACTURE VENTE DE STOCK N° ${idCourt}*
🏛️ *${gieName.toUpperCase()}*
───────────────────
👤 *${isMembre ? 'Membre' : 'Client'} :* ${nomTiers}${codeMembre ? ` (${codeMembre})` : ''}
🌾 *Produit vendu :* ${produit}
${nomCampagne ? `🌱 *Campagne :* ${nomCampagne}\n` : ''}📅 *Date :* ${dateVente}

━━━━━━━━━━━━━━━━━━━
📊 *DÉTAIL DE LA VENTE*
━━━━━━━━━━━━━━━━━━━
• Quantité : ${quantite} ${uVente}${nbCont}
• Prix unitaire : ${formatFactureAmount(prixUnitaire)}${unitStr} / ${uVente}
• *MONTANT TOTAL FACTURÉ :* ${formatFactureAmount(montantTotal)}${unitStr}
───────────────────
📌 *Imputation comptable :* Intégré directement au *${releveLabel}*
━━━━━━━━━━━━━━━━━━━
Merci de votre confiance.
_Message généré par SIGGIE_`
  )
}

/**
 * Génère la facture PDF A4 pour une Vente de Stock en nature.
 */
export async function generateVenteStockPdf({
  vente,
  gieName,
  unite = 'FCFA',
}: {
  vente: any
  gieName: string
  unite?: string
}) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const rawId = String(vente.id || '').replace(/^vente-/, '')
  const idCourt = rawId.substring(0, 8).toUpperCase() || 'VENTE'
  const isMembre = vente.tiers_type === 'membre' || Boolean(vente.membre_id || vente.membre?.id)
  const nomTiers =
    vente.tiers_nom ||
    vente.tiers ||
    (vente.membre ? `${vente.membre.prenom || ''} ${vente.membre.nom || ''}`.trim() : '') ||
    vente.client?.nom ||
    (isMembre ? 'Membre du GIE' : 'Client externe')
  const telephone = vente.membre?.telephone || vente.client?.telephone || ''
  const codeMembre = vente.membre?.code_membre || ''
  const dateStr = (vente.date_sortie || vente.date)
    ? new Date(vente.date_sortie || vente.date).toLocaleDateString('fr-FR')
    : new Date().toLocaleDateString('fr-FR')
  const nomCampagne = vente.campagne?.nom || 'Stock général'
  const produit = vente.campagne?.produit_collecte || vente.produit_collecte || 'Produit agricole en stock'
  const quantite = Number(vente.quantite || 0)
  const prixUnitaire = Number(vente.prix_unitaire || 0)
  const montantTotal = Number(vente.montant_total || quantite * prixUnitaire)
  const uVente = vente.unite_vente || vente.unite || 'kg'
  const nbCont = vente.nb_contenance ? ` (${vente.nb_contenance} sacs)` : ''

  // Header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(45, 106, 79)
  const gieLinesVente = doc.splitTextToSize(gieName, 105)
  doc.text(gieLinesVente, 14, gieLinesVente.length > 1 ? 22 : 27)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(45, 106, 79)
  doc.text('FACTURE DE VENTE', pageWidth - 14, 25, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(100, 100, 100)
  doc.text('Vente de Stock Agricole', pageWidth - 14, 31, { align: 'right' })

  doc.setDrawColor(45, 106, 79)
  doc.setLineWidth(0.5)
  doc.line(14, 40, pageWidth - 14, 40)

  // Infos Facture
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)
  doc.text('Informations de la vente :', 14, 47)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  doc.text(`N° Facture : VENTE-${idCourt}`, 14, 52)
  doc.text(`Date de vente : ${dateStr}`, 14, 57)
  doc.text(`Campagne d'origine : ${nomCampagne}`, 14, 62)

  // Facturé à
  doc.setFillColor(245, 247, 250)
  doc.roundedRect(pageWidth - 90, 44, 76, 23, 2, 2, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)
  doc.text(`Facturé à (${isMembre ? 'Membre GIE' : 'Client externe'}) :`, pageWidth - 85, 49)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(45, 106, 79)
  doc.text(nomTiers.toUpperCase(), pageWidth - 85, 55)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  if (codeMembre) {
    doc.text(`Code membre : ${codeMembre}`, pageWidth - 85, 60)
  } else {
    doc.text(`Catégorie : ${isMembre ? 'Membre du GIE' : 'Client Externe'}`, pageWidth - 85, 60)
  }
  if (telephone) {
    doc.text(`Tél : ${telephone}`, pageWidth - 85, 64.5)
  }

  const designation = [
    `Vente de stock : ${produit}`,
    vente.motif ? `Motif / Référence : ${vente.motif}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  autoTable(doc, {
    startY: 73,
    head: [['Désignation du produit vendu', `Quantité (${uVente})`, `Prix Unitaire / ${uVente}`, unite ? `Montant (${unite.trim()})` : 'Montant']],
    body: [
      [
        designation,
        `${quantite} ${uVente}${nbCont}`,
        formatFactureAmount(prixUnitaire),
        formatFactureAmount(montantTotal),
      ],
    ],
    theme: 'striped',
    headStyles: {
      fillColor: [45, 106, 79],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 3,
    },
    styles: {
      font: 'helvetica',
      fontSize: 10,
      cellPadding: 3.5,
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 32 },
      2: { halign: 'right', cellWidth: 35 },
      3: { halign: 'right', cellWidth: 40, fontStyle: 'bold' },
    },
  })

  const finalY = ((doc as any).lastAutoTable?.finalY || 110) + 8
  const totalBoxX = pageWidth - 90

  doc.setDrawColor(45, 106, 79)
  doc.setLineWidth(0.5)
  doc.line(totalBoxX, finalY, pageWidth - 14, finalY)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(45, 106, 79)
  doc.text('NET À PAYER :', totalBoxX, finalY + 8)
  doc.text(`${formatFactureAmount(montantTotal)} ${unite.trim()}`, pageWidth - 14, finalY + 8, { align: 'right' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(0, 0, 0)
  doc.text('Imputation comptable :', 14, finalY + 6)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(90, 90, 90)
  doc.text(
    `• Ce montant est imputé sur le ${isMembre ? 'Relevé Membre' : 'Relevé Client'} de ${nomTiers}.`,
    14,
    finalY + 12
  )

  // Signature Box
  doc.setDrawColor(200, 200, 200)
  doc.setLineDashPattern([2, 2], 0)
  doc.rect(pageWidth - 70, finalY + 22, 56, 22)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.text('Cachet et Signature du GIE', pageWidth - 67, finalY + 27)

  // Footer
  doc.setLineDashPattern([], 0)
  doc.setDrawColor(230, 230, 230)
  doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15)
  doc.text('Généré par SIGGIE - Système Intégré de Gestion pour GIE', pageWidth / 2, pageHeight - 10, { align: 'center' })

  const safeNom = nomTiers.replace(/\s+/g, '_') || 'Client'
  const filename = `Facture_Vente_${idCourt}_${safeNom}.pdf`
  const blob = doc.output('blob')
  const file = new File([blob], filename, { type: 'application/pdf' })

  return {
    doc,
    blob,
    file,
    filename,
    nomMembre: nomTiers,
    distributions: [],
    credits: [],
    totalDu: montantTotal,
    resteAPayer: montantTotal,
    quantiteNature: 'N/A',
  }
}

