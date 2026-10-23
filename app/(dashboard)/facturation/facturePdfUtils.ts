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
  doc.setFontSize(26)
  doc.setTextColor(45, 106, 79) // Vert
  doc.text(gieName, 14, 30)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.setTextColor(200, 200, 200)
  doc.text('FACTURE', pageWidth - 14, 35, { align: 'right' })

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
