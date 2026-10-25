import { createClient } from '@/utils/supabase/client'

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
 */
export function buildFactureWhatsAppText({
  facture,
  gieName,
  unite = 'FCFA',
  distributions = [],
  credits = [],
}: {
  facture: any
  gieName: string
  unite?: string
  distributions?: any[]
  credits?: any[]
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

  const montantInteret = Number(facture.montant_interet || 0)
  const montantTotal = Number(facture.montant_total || 0)
  const totalDu = montantTotal + montantInteret
  const montantPaye = Number(facture.montant_paye || 0)
  const resteAPayer = totalDu - montantPaye

  const prixCollecte = Number(facture.campagne?.prix_collecte || 0)
  const produitCollecte = facture.campagne?.produit_collecte || 'produit'
  const quantiteNature = prixCollecte > 0 && resteAPayer > 0
    ? `${(resteAPayer / prixCollecte).toFixed(1)} kg de ${produitCollecte}`
    : null

  const unitStr = unite ? ` ${unite.trim()}` : ' FCFA'

  // Détail des intrants
  const intrantsLines: string[] = []
  if (distributions && distributions.length > 0) {
    const grouped = new Map<string, { nom: string; qte: number; prix: number }>()
    distributions.forEach((d) => {
      const intrant = Array.isArray(d.intrants) ? d.intrants[0] : d.intrants
      if (intrant?.nom) {
        const key = `${intrant.nom}_${intrant.type_intrant || ''}`
        // Priorité absolue au prix facturé de campagne (prix_facturation) plutôt qu'au prix d'achat
        const prix = Number(
          d.prix_facturation ?? intrant.prix_facturation ?? (intrant.prix_unitaire || 0)
        )
        if (!grouped.has(key)) {
          grouped.set(key, { nom: intrant.nom, qte: 0, prix })
        }
        grouped.get(key)!.qte += Number(d.quantite || 0)
      }
    })
    grouped.forEach((item) => {
      const totalItem = item.qte * item.prix
      intrantsLines.push(`• ${item.nom} (x${item.qte}) : ${formatFactureAmount(totalItem)}${unitStr}`)
    })
  }

  // Crédits
  const creditsLines: string[] = []
  if (credits && credits.length > 0) {
    credits.forEach((c) => {
      const but = c.but_credit || 'Crédit de campagne'
      const m = Number(c.montant_demande || 0)
      creditsLines.push(`• ${but} : ${formatFactureAmount(m)}${unitStr}`)
    })
  }

  let detailsBlock = ''
  if (intrantsLines.length > 0 || creditsLines.length > 0) {
    const sections: string[] = []
    if (intrantsLines.length > 0) {
      sections.push(`📦 *Intrants fournis :*\n${intrantsLines.join('\n')}`)
    }
    if (creditsLines.length > 0) {
      sections.push(`💳 *Crédits accordés :*\n${creditsLines.join('\n')}`)
    }
    detailsBlock = `${sections.join('\n\n')}\n\n`
  }

  let statutMsg = ''
  if (facture.statut === 'payee' || resteAPayer <= 0) {
    statutMsg = `✅ *STATUT : FACTURE SOLDÉE / PAYÉE*`
    if (resteAPayer < 0) {
      statutMsg += `\n💚 *Surplus de remboursement : ${formatFactureAmount(Math.abs(resteAPayer))}${unitStr}*`
    }
  } else if (facture.statut === 'partiellement_paye' || montantPaye > 0) {
    statutMsg = `⏳ *STATUT : PARTIELLEMENT PAYÉE*\n👉 *RESTE À RÉGLER : ${formatFactureAmount(resteAPayer)}${unitStr}*`
  } else {
    statutMsg = `⚠️ *STATUT : EN ATTENTE DE RÈGLEMENT*\n👉 *RESTE À PAYER : ${formatFactureAmount(resteAPayer)}${unitStr}*`
  }

  let natureBlock = ''
  if (quantiteNature && resteAPayer > 0) {
    natureBlock = `\n⚖️ *Règlement en nature possible :*\n• Équivalent : *${quantiteNature}*\n  (sur la base de ${formatFactureAmount(prixCollecte)}${unitStr}/kg)\n`
  }

  return (
`*FACTURE N° ${idCourt}*
🏛️ *${gieName.toUpperCase()}*
───────────────────
👤 *Membre :* ${nomMembre}${codeMembre ? ` (${codeMembre})` : ''}
${village ? `📍 *Village :* ${village}\n` : ''}🌱 *Campagne :* ${nomCampagne}
📅 *Date d'émission :* ${new Date().toLocaleDateString('fr-FR')}

━━━━━━━━━━━━━━━━━━━
📊 *DÉTAIL FINANCIER*
━━━━━━━━━━━━━━━━━━━
${detailsBlock}• Fournitures & Crédits : ${formatFactureAmount(montantTotal)}${unitStr}
${montantInteret > 0 ? `• Intérêts de campagne : ${formatFactureAmount(montantInteret)}${unitStr}\n` : ''}• *TOTAL DÛ :* ${formatFactureAmount(totalDu)}${unitStr}
• Montant déjà réglé : ${formatFactureAmount(montantPaye)}${unitStr}
───────────────────
${statutMsg}
${natureBlock}
━━━━━━━━━━━━━━━━━━━
Merci de vous rapprocher de la trésorerie du GIE pour toute régularisation.
_Message généré par SIGGIE_`
  )
}

/**
 * Génère le document jsPDF et retourne les données associées (blob, file, etc.).
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
  let membreDetails: any = facture.membre

  if (membreId && campagneId) {
    if (!membreDetails?.village || !membreDetails?.telephone) {
      const { data: mData } = await supabase.from('membres').select('*').eq('id', membreId).maybeSingle()
      if (mData) membreDetails = mData
    }

    const [distRes, ciRes] = await Promise.all([
      supabase
        .from('distribution_intrants')
        .select(`
          intrant_id,
          quantite,
          intrants (nom, type_intrant, prix_unitaire)
        `)
        .eq('membre_id', membreId)
        .eq('campagne_id', campagneId),
      supabase
        .from('campagne_intrants')
        .select('intrant_id, prix_facturation')
        .eq('campagne_id', campagneId),
    ])

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
  }

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const nomMembre = `${membreDetails?.prenom || ''} ${membreDetails?.nom || ''}`.trim() || 'Membre'
  const nomCampagne = facture.campagne?.nom || 'N/A'
  const montantInteret = Number(facture.montant_interet || 0)
  const totalDu = Number(facture.montant_total || 0) + montantInteret
  const resteAPayer = totalDu - (facture.montant_paye || 0)
  const prixCollecte = facture.campagne?.prix_collecte || 0
  const quantiteNature = prixCollecte > 0 ? (resteAPayer / prixCollecte).toFixed(2) + ' kg' : 'N/A'

  // Header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(45, 106, 79) // Vert
  const gieLines = doc.splitTextToSize(gieName, 115)
  doc.text(gieLines, 14, gieLines.length > 1 ? 23 : 28)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(180, 180, 180)
  doc.text('FACTURE', pageWidth - 14, 28, { align: 'right' })

  // Ligne de séparation
  doc.setDrawColor(45, 106, 79)
  doc.setLineWidth(0.5)
  doc.line(14, 40, pageWidth - 14, 40)

  // Infos Facture
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)
  doc.text('Informations de la facture :', 14, 47)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  doc.text(`N° Facture : ${(facture.id || '').substring(0, 8).toUpperCase()}`, 14, 52)
  doc.text(`Date d'émission : ${new Date().toLocaleDateString('fr-FR')}`, 14, 57)
  doc.text(`Campagne : ${nomCampagne}`, 14, 62)

  // Facturé à (Client)
  doc.setFillColor(245, 247, 250)
  doc.roundedRect(pageWidth - 90, 44, 76, 21, 2, 2, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)
  doc.text('Facturé à :', pageWidth - 85, 49)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(45, 106, 79)
  doc.text(nomMembre.toUpperCase(), pageWidth - 85, 54.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  doc.text(`Village : ${membreDetails?.village || 'Non renseigné'}`, pageWidth - 85, 59.5)
  if (membreDetails?.telephone) {
    doc.text(`Tél : ${membreDetails.telephone}`, pageWidth - 85, 63.5)
  }

  // Tableau des détails
  const tableBody: any[] = []

  if (distributions && distributions.length > 0) {
    const groupedDist = new Map()
    distributions.forEach((d) => {
      const intrant = Array.isArray(d.intrants) ? d.intrants[0] : d.intrants
      if (intrant && intrant.nom) {
        const key = `${intrant.nom}_${intrant.type_intrant || ''}`
        const prixFact = Number(
          d.prix_facturation ?? intrant.prix_facturation ?? (intrant.prix_unitaire || 0)
        )
        if (!groupedDist.has(key)) {
          groupedDist.set(key, { ...intrant, quantite_total: 0, prix_facturation: prixFact })
        }
        groupedDist.get(key).quantite_total += Number(d.quantite || 0)
      }
    })

    groupedDist.forEach((item) => {
      const prix = item.prix_facturation ?? item.prix_unitaire ?? 0
      const total = item.quantite_total * prix
      tableBody.push([
        `${item.nom} (${item.type_intrant || 'Intrant'})`,
        item.quantite_total.toString(),
        formatFactureAmount(prix),
        formatFactureAmount(total),
      ])
    })
  }

  if (credits && credits.length > 0) {
    credits.forEach((c) => {
      tableBody.push([
        `Crédit : ${c.but_credit || 'Non spécifié'}`,
        '-',
        '-',
        formatFactureAmount(Number(c.montant_demande)),
      ])
    })
  }

  if (tableBody.length === 0) {
    tableBody.push(['Fournitures & Crédits de la campagne', '-', '-', formatFactureAmount(facture.montant_total)])
  }

  autoTable(doc, {
    startY: 70,
    head: [["Désignation de l'article", 'Qté', 'Prix Unitaire', unite ? `Montant (${unite.trim()})` : 'Montant']],
    body: tableBody,
    theme: 'striped',
    headStyles: {
      fillColor: [45, 106, 79],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 2.5,
    },
    styles: {
      font: 'helvetica',
      fontSize: 10,
      cellPadding: 3,
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'right', cellWidth: 35 },
      3: { halign: 'right', cellWidth: 40, fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
  })

  // Récapitulatif financier
  const tableEndY = (doc as any).lastAutoTable?.finalY || 130
  const footerBlockHeight = 85
  let finalY = tableEndY
  if (finalY + footerBlockHeight > pageHeight) {
    doc.addPage()
    finalY = 15
  }

  const totalBoxX = pageWidth - 85
  doc.setDrawColor(220, 220, 220)
  doc.line(totalBoxX, finalY + 5, pageWidth - 14, finalY + 5)

  let ty = finalY + 11
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)

  if (montantInteret > 0) {
    doc.text('Intérêt :', totalBoxX, ty)
    doc.text(`${formatFactureAmount(montantInteret)}`, pageWidth - 14, ty, { align: 'right' })
    ty += 6
  }

  doc.text('Total Dû :', totalBoxX, ty)
  doc.text(`${formatFactureAmount(totalDu)}`, pageWidth - 14, ty, { align: 'right' })
  ty += 6

  doc.text('Montant Payé :', totalBoxX, ty)
  doc.setTextColor(45, 106, 79)
  doc.text(`-${formatFactureAmount(facture.montant_paye || 0)}`, pageWidth - 14, ty, { align: 'right' })
  ty += 3

  // Barre grasse pour le Reste à Payer / Surplus
  doc.setDrawColor(45, 106, 79)
  doc.setLineWidth(0.5)
  doc.line(totalBoxX, ty, pageWidth - 14, ty)
  ty += 7

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)

  if (resteAPayer < 0) {
    doc.setTextColor(45, 106, 79)
    doc.text('SURPLUS DE REMB. :', totalBoxX, ty)
    doc.text(`${formatFactureAmount(Math.abs(resteAPayer))}${unite}`, pageWidth - 14, ty, { align: 'right' })
  } else {
    doc.setTextColor(220, 38, 38)
    doc.text('RESTE À PAYER :', totalBoxX, ty)
    doc.text(`${formatFactureAmount(resteAPayer)}${unite}`, pageWidth - 14, ty, { align: 'right' })
  }

  // Modalités
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.text('Modalités de remboursement :', 14, finalY + 11)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text(`• Type de remboursement : Numéraire ou Nature`, 14, finalY + 17)

  if (prixCollecte > 0 && resteAPayer > 0) {
    doc.text(`• Équivalent nature pour solder : ${quantiteNature}`, 14, finalY + 23)
    doc.text(`  (Calculé sur la base de ${prixCollecte}${unite} / kg)`, 14, finalY + 28)
  }

  // Mentions
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(9)
  doc.setTextColor(150, 150, 150)
  doc.text('Merci de conserver cette facture précieusement.', 14, finalY + 42)

  // Signature Box
  doc.setDrawColor(200, 200, 200)
  doc.setLineDashPattern([2, 2], 0)
  doc.rect(pageWidth - 70, finalY + 42, 56, 22)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('Cachet et Signature du GIE', pageWidth - 67, finalY + 47)

  // Footer
  doc.setLineDashPattern([], 0)
  doc.setDrawColor(230, 230, 230)
  doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15)
  doc.text('Généré par SIGGIE - Système Intégré de Gestion pour GIE', pageWidth / 2, pageHeight - 10, { align: 'center' })

  const safeNom = nomMembre.replace(/\s+/g, '_') || 'Facture'
  const filename = `Facture_${(facture.id || '').substring(0, 8)}_${safeNom}.pdf`
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
    totalDu,
    resteAPayer,
    quantiteNature,
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
• Quantité : ${quantite} kg
• Prix unitaire : ${formatFactureAmount(prixUnitaire)}${unitStr} / kg
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
    head: [['Désignation du produit vendu', 'Quantité (kg)', 'Prix Unitaire / kg', unite ? `Montant (${unite.trim()})` : 'Montant']],
    body: [
      [
        designation,
        `${quantite} kg`,
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

