'use client'

import { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import { formatMontant } from '@/lib/currency'
import type { BilanCalcule, Ligne } from '@/lib/bilan-annuel'

// jsPDF (police Helvetica standard) ne sait pas afficher les espaces insécables
// fines produites par toLocaleString('fr-FR') : on les remplace par des espaces simples.
const pdfMontant = (v: number, devise: string) => formatMontant(v, devise).replace(/[  ]/g, ' ')

const VERT: [number, number, number] = [45, 106, 79]

export type GieEntete = {
  nom: string
  adresse: string
  telephone: string
  email: string
  identification: string
  logoUrl: string | null
}

// Charge le logo du GIE en data URL pour jsPDF. Un logo illisible (CORS, format non
// supporté comme SVG/WebP) ne doit jamais empêcher l'export : on l'omet simplement.
async function chargerLogo(url: string | null): Promise<{ data: string; format: 'PNG' | 'JPEG' } | null> {
  if (!url) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    const format = blob.type === 'image/png' ? 'PNG' : blob.type === 'image/jpeg' ? 'JPEG' : null
    if (!format) return null
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
    return { data, format }
  } catch {
    return null
  }
}

// La police standard (Helvetica) n'a pas de glyphes arabes : en arabe on embarque Amiri
// (servie depuis /public/fonts). jsPDF assure lui-même la mise en forme des lettres arabes.
async function chargerPoliceArabe(doc: import('jspdf').jsPDF): Promise<boolean> {
  try {
    const res = await fetch('/fonts/Amiri-Regular.ttf')
    if (!res.ok) return false
    const bytes = new Uint8Array(await res.arrayBuffer())
    let binaire = ''
    for (let i = 0; i < bytes.length; i += 0x8000) binaire += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
    doc.addFileToVFS('Amiri-Regular.ttf', btoa(binaire))
    doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal')
    doc.addFont('Amiri-Regular.ttf', 'Amiri', 'bold')
    return true
  } catch {
    return false
  }
}

export default function BilanAnnuelPdfButton({
  annee, n, n1, devise, gie, locale, t, label,
}: {
  annee: number
  n: BilanCalcule
  n1: BilanCalcule
  devise: string
  gie: GieEntete
  locale: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any
  label: string
}) {
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    setLoading(true)
    try {
      // Import différé : jspdf n'est chargé qu'au clic sur l'export.
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const m = (v: number) => pdfMontant(v, devise)

      const arabe = locale === 'ar' && (await chargerPoliceArabe(doc))
      const police = arabe ? 'Amiri' : 'helvetica'
      const debutX = arabe ? pageWidth - 14 : 14
      const align = arabe ? ('right' as const) : ('left' as const)

      // ---- En-tête de l'entreprise : logo, nom, coordonnées ----
      const logo = await chargerLogo(gie.logoUrl)
      let texteX = debutX
      if (logo) {
        const props = doc.getImageProperties(logo.data)
        const hauteur = 20
        const largeur = Math.min(40, (props.width / props.height) * hauteur)
        doc.addImage(logo.data, logo.format, arabe ? debutX - largeur : debutX, 10, largeur, hauteur)
        texteX = arabe ? debutX - largeur - 4 : debutX + largeur + 4
      }
      doc.setFont(police, 'bold')
      doc.setFontSize(18)
      doc.setTextColor(...VERT)
      doc.text(gie.nom, texteX, 17, { align })
      doc.setFont(police, 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(90, 90, 90)
      const coordonnees = [gie.adresse, [gie.telephone, gie.email].filter(Boolean).join('  |  '), gie.identification].filter(Boolean)
      coordonnees.forEach((ligne, i) => doc.text(ligne, texteX, 23 + i * 4.5, { align }))
      const basEntete = Math.max(logo ? 32 : 0, 23 + coordonnees.length * 4.5 + 2)
      doc.setDrawColor(...VERT)
      doc.setLineWidth(0.6)
      doc.line(14, basEntete, pageWidth - 14, basEntete)

      doc.setFont(police, 'bold')
      doc.setFontSize(12)
      doc.setTextColor(40, 40, 40)
      doc.text(`${t.title} - ${annee}`, debutX, basEntete + 8, { align })
      doc.setFont(police, 'normal')
      doc.setFontSize(8)
      doc.setTextColor(120, 120, 120)
      doc.text(new Date().toLocaleDateString(arabe ? 'ar' : locale === 'en' ? 'en-GB' : 'fr-FR'), arabe ? 14 : pageWidth - 14, basEntete + 8, { align: arabe ? 'left' : 'right' })

      let y = basEntete + 16
      const titre = (texte: string) => {
        doc.setFont(police, 'bold')
        doc.setFontSize(11)
        doc.setTextColor(...VERT)
        doc.text(texte, debutX, y, { align })
        y += 3
      }
      const suite = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        y = ((doc as any).lastAutoTable?.finalY ?? y) + 10
      }
      const style = {
        theme: 'grid' as const,
        styles: { font: police, fontSize: 8.5, cellPadding: 2 },
        headStyles: { fillColor: VERT, textColor: 255 },
        margin: { left: 14, right: 14 },
      }

      const bilanRows = (side: 'actif' | 'passif', keys: string[]) => {
        const cur = n[side] as unknown as Record<string, Ligne>
        const prev = n1[side] as unknown as Record<string, Ligne>
        const ligne = (k: string, label: string, bold = false) => {
          const cells = [label, m(cur[k].brut), m(cur[k].amo), m(cur[k].net), m(prev[k].net)]
          return bold ? cells.map((content) => ({ content, styles: { fontStyle: 'bold' as const } })) : cells
        }
        return [...keys.map((k) => ligne(k, t.rows[k])), ligne('total', t.rows[`total_${side}`], true)]
      }
      const bilanHead = [[t.cols.rubrique, t.cols.brut, t.cols.amo, t.cols.net, t.cols.net_n1]]
      const colStyles = { 0: { cellWidth: 62 }, 1: { halign: 'right' as const }, 2: { halign: 'right' as const }, 3: { halign: 'right' as const }, 4: { halign: 'right' as const } }

      titre(`${t.actif_title} ${annee}`)
      autoTable(doc, { ...style, startY: y, head: bilanHead, body: bilanRows('actif', ['immobilisations', 'stocks', 'creances', 'disponibilites']), columnStyles: colStyles })
      suite()

      titre(`${t.passif_title} ${annee}`)
      autoTable(doc, { ...style, startY: y, head: bilanHead, body: bilanRows('passif', ['capital', 'resultat', 'subventions', 'emprunts', 'dettes', 'credits_tresorerie']), columnStyles: colStyles })
      suite()

      const cr = n.resultat as unknown as Record<string, number>
      const cr1 = n1.resultat as unknown as Record<string, number>
      const crLigne = (k: string, bold = false) => {
        const cells = [t.rows[k], m(cr[k]), m(cr1[k])]
        return bold ? cells.map((content) => ({ content, styles: { fontStyle: 'bold' as const } })) : cells
      }
      const corps = [
        ...['ventes', 'gain_remboursement', 'prestations', 'autres_produits'].map((k) => crLigne(k)),
        crLigne('total_produits', true),
        ...['achats', 'variation_stock', 'perte_remboursement', 'charges_materiel', 'interets', 'autres_charges'].map((k) => crLigne(k)),
        crLigne('total_charges', true),
        crLigne('resultat', true),
      ]
      // Le compte de résultat tient rarement dans le bas de la page du bilan.
      if (y > 170) {
        doc.addPage()
        y = 20
      }
      titre(`${t.resultat_title} ${annee}`)
      autoTable(doc, {
        ...style,
        startY: y,
        head: [[t.cols.rubrique, t.cols.montant, t.cols.montant_n1]],
        body: corps,
        columnStyles: { 0: { cellWidth: 90 }, 1: { halign: 'right' }, 2: { halign: 'right' } },
      })

      doc.save(`bilan-annuel-${annee}.pdf`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={generate}
      disabled={loading}
      title={label}
      className="inline-flex items-center gap-1.5 rounded-md bg-surface border border-surface-border px-2.5 py-1.5 text-sm font-medium text-foreground hover:bg-background transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin text-foreground-muted" /> : <FileDown className="h-4 w-4 text-foreground-muted" />}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}
