'use client'

import { useState } from 'react'
import { Download, Printer, Loader2 } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { createClient } from '@/utils/supabase/client'

// Fonction pour formater les montants proprement sans espaces insécables qui posent problème à jsPDF
const formatAmount = (amount: number | undefined | null) => {
  if (!amount) return '0'
  return Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")
}

export default function DownloadPdfButton({ facture, dict }: { facture: any; dict: any }) {
  const [loadingAction, setLoadingAction] = useState<'download' | 'print' | null>(null)

  const generatePDF = async (action: 'download' | 'print') => {
    setLoadingAction(action)
    try {
      const supabase = createClient()
      
      const membreId = facture.membre?.id || facture.membre_id
      const campagneId = facture.campagne?.id || facture.campagne_id

      let distributions: any[] = []
      let credits: any[] = []
      let membreDetails: any = facture.membre

      if (membreId && campagneId) {
        // Tenter de récupérer plus de détails sur le membre si nécessaire (village, tel)
        if (!membreDetails?.village) {
          const { data: mData } = await supabase.from('membres').select('*').eq('id', membreId).single()
          if (mData) membreDetails = mData
        }

        const { data: distData, error: distError } = await supabase
          .from('distribution_intrants')
          .select(`
            quantite,
            intrants (nom, type_intrant, prix_unitaire)
          `)
          .eq('membre_id', membreId)
          .eq('campagne_id', campagneId)
          
        if (distError) console.error("Erreur distData:", distError)
        if (distData) distributions = distData

        const { data: credData, error: credError } = await supabase
          .from('credits')
          .select('montant_demande, but_credit')
          .eq('membre_id', membreId)
          .eq('campagne_id', campagneId)
          .eq('statut', 'valide')
          
        if (credError) console.error("Erreur credData:", credError)
        if (credData) credits = credData
      }

      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()

      const nomMembre = `${membreDetails?.prenom || ''} ${membreDetails?.nom || ''}`.trim()
      const nomCampagne = facture.campagne?.nom || 'N/A'
      const montantInteret = Number(facture.montant_interet || 0)
      const totalDu = Number(facture.montant_total || 0) + montantInteret
      const resteAPayer = totalDu - (facture.montant_paye || 0)
      const prixCollecte = facture.campagne?.prix_collecte || 0
      const quantiteNature = prixCollecte > 0 ? (resteAPayer / prixCollecte).toFixed(2) + ' kg' : 'N/A'

      // ==========================================
      // HEADER (GIE Ndiaganiao & Titre FACTURE)
      // ==========================================
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(26)
      doc.setTextColor(45, 106, 79) // Vert
      doc.text('GIE Ndiaganiao', 14, 25)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text('Adresse : Ndiaganiao, Sénégal', 14, 32)
      doc.text('Téléphone : +221 00 000 00 00', 14, 37)
      doc.text('Email : contact@gie-ndiaganiao.sn', 14, 42)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(28)
      doc.setTextColor(200, 200, 200) // Gris clair pour le grand titre
      doc.text('FACTURE', pageWidth - 14, 35, { align: 'right' })

      // Ligne de séparation
      doc.setDrawColor(45, 106, 79)
      doc.setLineWidth(0.5)
      doc.line(14, 48, pageWidth - 14, 48)

      // ==========================================
      // INFOS FACTURE ET CLIENT
      // ==========================================
      // Bloc de gauche : Informations Facture
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.text('Informations de la facture :', 14, 57)
      
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(80, 80, 80)
      doc.text(`N° Facture : ${facture.id.substring(0, 8).toUpperCase()}`, 14, 63)
      doc.text(`Date d'émission : ${new Date().toLocaleDateString('fr-FR')}`, 14, 69)
      doc.text(`Campagne : ${nomCampagne}`, 14, 75)
      
      // Bloc de droite : Facturé à (Client)
      doc.setFillColor(245, 247, 250) // Fond gris très clair
      doc.roundedRect(pageWidth - 90, 52, 76, 28, 2, 2, 'F')
      
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.text('Facturé à :', pageWidth - 85, 59)
      
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(45, 106, 79)
      doc.text(nomMembre.toUpperCase(), pageWidth - 85, 66)
      
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(80, 80, 80)
      doc.text(`Village : ${membreDetails?.village || 'Non renseigné'}`, pageWidth - 85, 72)
      if (membreDetails?.telephone) {
        doc.text(`Tél : ${membreDetails.telephone}`, pageWidth - 85, 77)
      }

      // ==========================================
      // TABLEAU DES DÉTAILS
      // ==========================================
      const tableBody = []
      
      if (distributions && distributions.length > 0) {
        const groupedDist = new Map()
        distributions.forEach(d => {
          const intrant = Array.isArray(d.intrants) ? d.intrants[0] : d.intrants
          if (intrant && intrant.nom) {
            const key = `${intrant.nom}_${intrant.type_intrant}`
            if (!groupedDist.has(key)) {
              groupedDist.set(key, { ...intrant, quantite_total: 0 })
            }
            groupedDist.get(key).quantite_total += Number(d.quantite)
          }
        })

        groupedDist.forEach((item) => {
          const prix = item.prix_unitaire || 0
          const total = item.quantite_total * prix
          tableBody.push([
            `${item.nom} (${item.type_intrant || 'Intrant'})`,
            item.quantite_total.toString(),
            formatAmount(prix),
            formatAmount(total)
          ])
        })
      }

      if (credits && credits.length > 0) {
        credits.forEach(c => {
          tableBody.push([
            `Crédit : ${c.but_credit || 'Non spécifié'}`,
            '-',
            '-',
            formatAmount(Number(c.montant_demande))
          ])
        })
      }
      
      if (tableBody.length === 0) {
         tableBody.push(['Fournitures & Crédits de la campagne', '-', '-', formatAmount(facture.montant_total)])
      }

      autoTable(doc, {
        startY: 90,
        head: [['Désignation de l\'article', 'Quantité', 'Prix Unitaire', 'Montant (FCFA)']],
        body: tableBody,
        theme: 'striped',
        headStyles: { 
          fillColor: [45, 106, 79],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'left'
        },
        styles: {
          font: 'helvetica',
          fontSize: 10,
          cellPadding: 6,
        },
        columnStyles: {
          0: { halign: 'left', cellWidth: 'auto' },
          1: { halign: 'center', cellWidth: 25 },
          2: { halign: 'right', cellWidth: 35 },
          3: { halign: 'right', cellWidth: 40, fontStyle: 'bold' }
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251]
        }
      })

      // ==========================================
      // RÉCAPITULATIF FINANCIER (TOTALS BOX)
      // ==========================================
      const finalY = (doc as any).lastAutoTable.finalY || 130
      
      // Position du bloc total à droite
      const totalBoxX = pageWidth - 85 // élargi un peu pour "SURPLUS DE REMBOURSEMENT"
      
      doc.setDrawColor(220, 220, 220)
      doc.line(totalBoxX, finalY + 5, pageWidth - 14, finalY + 5)

      let ty = finalY + 12
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(80, 80, 80)

      if (montantInteret > 0) {
        doc.text('Intérêt :', totalBoxX, ty)
        doc.text(`${formatAmount(montantInteret)}`, pageWidth - 14, ty, { align: 'right' })
        ty += 7
      }

      doc.text('Total Dû :', totalBoxX, ty)
      doc.text(`${formatAmount(totalDu)}`, pageWidth - 14, ty, { align: 'right' })
      ty += 7

      doc.text('Montant Payé :', totalBoxX, ty)
      doc.setTextColor(45, 106, 79) // Vert
      doc.text(`-${formatAmount(facture.montant_paye || 0)}`, pageWidth - 14, ty, { align: 'right' })
      ty += 4

      // Barre grasse pour le Reste à Payer / Surplus
      doc.setDrawColor(45, 106, 79)
      doc.setLineWidth(0.5)
      doc.line(totalBoxX, ty, pageWidth - 14, ty)
      ty += 8

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)

      if (resteAPayer < 0) {
        doc.setTextColor(45, 106, 79) // Vert pour le surplus
        doc.text('SURPLUS DE REMB. :', totalBoxX, ty)
        doc.text(`${formatAmount(Math.abs(resteAPayer))} FCFA`, pageWidth - 14, ty, { align: 'right' })
      } else {
        doc.setTextColor(220, 38, 38) // Rouge pour le reste à payer
        doc.text('RESTE À PAYER :', totalBoxX, ty)
        doc.text(`${formatAmount(resteAPayer)} FCFA`, pageWidth - 14, ty, { align: 'right' })
      }

      // ==========================================
      // MODALITÉS & PIED DE PAGE
      // ==========================================
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.text('Modalités de remboursement :', 14, finalY + 12)
      
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)
      doc.text(`• Type de remboursement : Numéraire ou Nature`, 14, finalY + 18)
      
      if (prixCollecte > 0 && resteAPayer > 0) {
        doc.text(`• Équivalent nature pour solder : ${quantiteNature}`, 14, finalY + 24)
        doc.text(`  (Calculé sur la base de ${prixCollecte} FCFA / kg)`, 14, finalY + 29)
      }

      // Mentions légales / Signature en bas
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(9)
      doc.setTextColor(150, 150, 150)
      doc.text('Merci de conserver cette facture précieusement.', 14, finalY + 45)

      // Signature Box
      doc.setDrawColor(200, 200, 200)
      doc.setLineDashPattern([2, 2], 0)
      doc.rect(pageWidth - 70, finalY + 45, 56, 25)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.text('Cachet et Signature du GIE', pageWidth - 67, finalY + 50)
      
      // Footer tout en bas
      doc.setLineDashPattern([], 0)
      doc.setDrawColor(230, 230, 230)
      doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15)
      doc.text('Généré par SIGGIE - Système Intégré de Gestion pour GIE', pageWidth / 2, pageHeight - 10, { align: 'center' })

      const safeNom = nomMembre.replace(/\s+/g, '_') || 'Facture'
      if (action === 'download') {
        doc.save(`Facture_${facture.id.substring(0, 8)}_${safeNom}.pdf`)
      } else if (action === 'print') {
        doc.autoPrint()
        window.open(doc.output('bloburl'), '_blank')
      }
    } catch (error) {
      console.error("Erreur génération PDF:", error)
      alert("Impossible de générer le PDF.")
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <>
      <button 
        onClick={() => generatePDF('print')}
        disabled={loadingAction !== null}
        className="text-foreground-muted hover:text-foreground p-1 transition-colors disabled:opacity-50" 
        title={dict.facturation_extra.print_tooltip}
      >
        {loadingAction === 'print' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
      </button>
      <button 
        onClick={() => generatePDF('download')}
        disabled={loadingAction !== null}
        className="text-foreground-muted hover:text-primary p-1 transition-colors disabled:opacity-50" 
        title={dict.facturation_extra.download_tooltip}
      >
        {loadingAction === 'download' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      </button>
    </>
  )
}
