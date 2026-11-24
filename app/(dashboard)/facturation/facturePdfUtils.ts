import { createClient } from '@/utils/supabase/client'
import { getSpeculationsCampagne } from '@/app/(dashboard)/campagnes/[id]/speculations/actions'
import { extraireParcellesObservations, extraireTagSpeculation } from '@/lib/speculations'
import { getCreditSpeculationId, getCreditSpeculationNom } from '@/lib/credits-types'

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

  const targetSpecId = facture.filterSpeculationId || (facture as any).filterSpecId || null

  let targetNom = ''
  let effectiveMemberParcelles = memberParcelles || []
  if (targetSpecId && effectiveMemberParcelles.length > 0) {
    const matched = effectiveMemberParcelles.find((p: any) => p.speculationId === targetSpecId)
    if (matched) {
      effectiveMemberParcelles = [matched]
      targetNom = matched.nom
    } else {
      const sObj = (speculations || []).find((s: any) => s.id === targetSpecId)
      if (sObj) targetNom = sObj.nom
    }
  }

  let montantInteret = Number(facture.montant_interet || 0)
  let montantTotal = Number(facture.montant_total || 0)
  let totalDu = montantTotal + montantInteret
  let montantPaye = Number(facture.montant_paye || 0)
  let resteAPayer = totalDu - montantPaye

  const unitStr = unite ? ` ${unite.trim()}` : ' FCFA'

  // 1. Bloc Cultures & Parcelles exploitées
  let culturesBlock = ''
  const totalMemberSuperficie = effectiveMemberParcelles.reduce((sum: number, p: any) => sum + (Number(p.superficie) || 0), 0)
  if (effectiveMemberParcelles && effectiveMemberParcelles.length > 0) {
    const lines = effectiveMemberParcelles.map((p: any) => {
      const casier = p.casier ? ` (Casier : ${p.casier})` : ''
      const varStr = p.variete ? ` [Var. ${p.variete}]` : ''
      return `• *${p.nom}*${varStr} : ${Number(p.superficie).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ha${casier}`
    })
    culturesBlock = targetSpecId
      ? `\n🌾 *CULTURE SPÉCIFIQUE :*\n${lines.join('\n')}\n👉 *Superficie : ${totalMemberSuperficie.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ha*\n`
      : `\n🌾 *CULTURES EXPLOITÉES :*\n${lines.join('\n')}\n👉 *Superficie totale exploitée : ${totalMemberSuperficie.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ha*\n`
  }

  // 2. Ventilation des intrants et crédits par spéculation
  let specDetailsBlock = ''
  if (effectiveMemberParcelles && effectiveMemberParcelles.length > 0 && (distributions.length > 0 || credits.length > 0)) {
    const specSections: string[] = []
    effectiveMemberParcelles.forEach((p: any) => {
      const ratio = totalMemberSuperficie > 0 ? Number(p.superficie) / totalMemberSuperficie : 1 / effectiveMemberParcelles.length
      const pItems: string[] = []
      let pTotal = 0

      distributions.forEach((d: any) => {
        const intrant = Array.isArray(d.intrants) ? d.intrants[0] : d.intrants
        if (!intrant?.nom) return
        const prix = Number(d.prix_facturation ?? intrant.prix_facturation ?? (intrant.prix_unitaire || 0))
        const qteTotal = Number(d.quantite || 0)

        if (d.speculation_id && d.speculation_id === p.speculationId) {
          const itTotal = qteTotal * prix
          pTotal += itTotal
          pItems.push(`  • ${intrant.nom} (x${qteTotal}) : ${formatFactureAmount(itTotal)}${unitStr}`)
        } else if (!d.speculation_id) {
          const qAlloc = Math.round(qteTotal * ratio * 100) / 100
          if (qAlloc > 0) {
            const itTotal = Math.round(qAlloc * prix)
            pTotal += itTotal
            pItems.push(`  • ${intrant.nom} (x${qAlloc}) : ${formatFactureAmount(itTotal)}${unitStr}`)
          }
        }
      })

      credits.forEach((c: any) => {
        const sId = getCreditSpeculationId(c)
        const sNom = getCreditSpeculationNom(c)
        if ((sId && sId === p.speculationId) || (sNom && sNom.toLowerCase() === p.nom.toLowerCase())) {
          const m = Number(c.montant_demande || c.montant_accorde || 0)
          pTotal += m
          pItems.push(`  • Crédit ${c.but_credit || ''} : ${formatFactureAmount(m)}${unitStr}`)
        }
      })

      if (pItems.length > 0) {
        specSections.push(
          `▫️ *${p.nom.toUpperCase()} (${Number(p.superficie).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ha) :*\n${pItems.join('\n')}\n  _Sous-total ${p.nom} : ${formatFactureAmount(pTotal)}${unitStr}_`
        )
      }
    })

    if (specSections.length > 0) {
      specDetailsBlock = `━━━━━━━━━━━━━━━━━━━\n🌾 *DÉTAIL PAR SPÉCULATION*\n━━━━━━━━━━━━━━━━━━━\n${specSections.join('\n\n')}\n\n`
    }
  }

  // 3. Regroupement consolidé par intrant
  const intrantsLines: string[] = []
  if (distributions && distributions.length > 0) {
    const grouped = new Map<string, { nom: string; qte: number; prix: number }>()
    distributions.forEach((d: any) => {
      if (targetSpecId && d.speculation_id && d.speculation_id !== targetSpecId) return
      const intrant = Array.isArray(d.intrants) ? d.intrants[0] : d.intrants
      if (intrant?.nom) {
        const key = `${intrant.nom}_${intrant.type_intrant || ''}`
        const prix = Number(d.prix_facturation ?? intrant.prix_facturation ?? (intrant.prix_unitaire || 0))
        let qte = Number(d.quantite || 0)
        if (targetSpecId && !d.speculation_id && effectiveMemberParcelles.length > 0) {
          // Prorata si intrant non ventilé
          const ratio = (memberParcelles && memberParcelles.length > 0)
            ? Number(effectiveMemberParcelles[0]?.superficie || 0) / (memberParcelles.reduce((s, p) => s + Number(p.superficie || 0), 0) || 1)
            : 1
          qte = Math.round(qte * ratio * 100) / 100
        }
        if (qte <= 0) return
        if (!grouped.has(key)) {
          grouped.set(key, { nom: intrant.nom, qte: 0, prix })
        }
        grouped.get(key)!.qte += qte
      }
    })
    grouped.forEach((item) => {
      const totalItem = item.qte * item.prix
      intrantsLines.push(`• ${item.nom} (x${item.qte.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}) : ${formatFactureAmount(totalItem)}${unitStr}`)
    })
  }

  // Crédits
  const creditsLines: string[] = []
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
      creditsLines.push(`• ${but} : ${formatFactureAmount(m)}${unitStr}`)
    })
  }

  let recapConsolideBlock = ''
  if (intrantsLines.length > 0) {
    recapConsolideBlock = targetSpecId && targetNom
      ? `━━━━━━━━━━━━━━━━━━━\n📦 *RÉCAPITULATIF DES INTRANTS*\n_(Culture : ${targetNom.toUpperCase()})_\n━━━━━━━━━━━━━━━━━━━\n${intrantsLines.join('\n')}\n\n`
      : `━━━━━━━━━━━━━━━━━━━\n📦 *RÉCAPITULATIF CONSOLIDÉ PAR INTRANT*\n_(Toutes spéculations confondues)_\n━━━━━━━━━━━━━━━━━━━\n${intrantsLines.join('\n')}\n\n`
  }
  if (creditsLines.length > 0) {
    recapConsolideBlock += `💳 *Crédits accordés :*\n${creditsLines.join('\n')}\n\n`
  }

  // 4. Suivi des remboursements par spéculation d'abord
  let specRembWhatsAppBlock = ''
  let effectiveSpecRemb = (remboursementsParSpeculation && remboursementsParSpeculation.length > 0)
    ? [...remboursementsParSpeculation]
    : (facture.remboursements_par_speculation && facture.remboursements_par_speculation.length > 0)
      ? [...facture.remboursements_par_speculation]
      : (effectiveMemberParcelles && effectiveMemberParcelles.length > 0 && montantPaye > 0)
        ? effectiveMemberParcelles.map((p: any) => {
            const ratio = totalMemberSuperficie > 0 ? Number(p.superficie) / totalMemberSuperficie : 1 / effectiveMemberParcelles.length
            const specDu = Math.round(totalDu * ratio)
            const specPaye = Math.round(montantPaye * ratio)
            const solde = specDu - specPaye
            const taux = specDu > 0 ? Math.min(100, Math.round((specPaye / specDu) * 100)) : 100
            return {
              speculation_id: p.speculationId,
              nom: p.nom,
              superficie: Number(p.superficie || 0),
              montant_du: specDu,
              montant_rembourse: specPaye,
              quantite_nature: 0,
              valeur_nature: 0,
              montant_numeraire: specPaye,
              solde,
              taux_recouvrement: taux,
            }
          })
        : []

  if (targetSpecId && effectiveSpecRemb.length > 0) {
    const matched = effectiveSpecRemb.find((s: any) => s.speculation_id === targetSpecId)
    if (matched) {
      effectiveSpecRemb = [matched]
      totalDu = Number(matched.montant_du || 0)
      montantTotal = totalDu
      montantInteret = 0
      montantPaye = Number(matched.montant_rembourse || 0)
      resteAPayer = Number(matched.solde || 0)
      if (!targetNom) targetNom = matched.nom
    }
  }

  if (effectiveSpecRemb.length > 0) {
    const rembLines = effectiveSpecRemb.map((sp: any) => {
      const supStr = sp.superficie ? ` (${Number(sp.superficie).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ha)` : ''
      const detailParts: string[] = []
      if (sp.quantite_nature > 0) {
        detailParts.push(`Nature: ${Number(sp.quantite_nature).toLocaleString('fr-FR')} ${sp.unite_mesure || 'kg'} = ${formatFactureAmount(sp.valeur_nature)}${unitStr}`)
      }
      if (sp.montant_numeraire > 0) {
        detailParts.push(`Numéraire: ${formatFactureAmount(sp.montant_numeraire)}${unitStr}`)
      }
      const detailStr = detailParts.length > 0 ? ` [${detailParts.join(', ')}]` : ''
      const soldeStr = sp.solde > 0
        ? `Reste : ${formatFactureAmount(sp.solde)}${unitStr}`
        : sp.solde < 0
        ? `Surplus : +${formatFactureAmount(Math.abs(sp.solde))}${unitStr}`
        : `Soldé ✅`
      return `▫️ *${sp.nom.toUpperCase()}*${supStr} :\n  • Dû : ${formatFactureAmount(sp.montant_du)}${unitStr}\n  • Réglé : ${formatFactureAmount(sp.montant_rembourse)}${unitStr}${detailStr}\n  • ${soldeStr} (Taux : ${sp.taux_recouvrement ?? 0}%)`
    })
    specRembWhatsAppBlock = targetSpecId
      ? `━━━━━━━━━━━━━━━━━━━\n🌾 *SUIVI DU RÈGLEMENT (${targetNom.toUpperCase()})*\n━━━━━━━━━━━━━━━━━━━\n${rembLines.join('\n\n')}\n\n`
      : `━━━━━━━━━━━━━━━━━━━\n🌾 *REMBOURSEMENTS PAR SPÉCULATION*\n━━━━━━━━━━━━━━━━━━━\n${rembLines.join('\n\n')}\n\n`
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

  // Modalités de remboursement en nature par culture
  let natureBlock = ''
  if (resteAPayer > 0 && effectiveMemberParcelles && effectiveMemberParcelles.length > 0) {
    const natLines: string[] = []
    effectiveMemberParcelles.forEach((p: any) => {
      if (p.prixCollecte > 0) {
        const qKg = (resteAPayer / p.prixCollecte).toFixed(1)
        natLines.push(`• Équivalent *${p.produitCollecte || p.nom}* : *${qKg} kg* (à ${formatFactureAmount(p.prixCollecte)}${unitStr}/kg)`)
      }
    })
    if (natLines.length > 0) {
      natureBlock = `\n⚖️ *Règlement en nature possible :*\n${natLines.join('\n')}\n`
    }
  } else if (resteAPayer > 0 && Number(facture.campagne?.prix_collecte || 0) > 0) {
    const pColl = Number(facture.campagne.prix_collecte)
    const qKg = (resteAPayer / pColl).toFixed(1)
    natureBlock = `\n⚖️ *Règlement en nature possible :*\n• Équivalent *${facture.campagne.produit_collecte || 'produit'}* : *${qKg} kg* (à ${formatFactureAmount(pColl)}${unitStr}/kg)\n`
  }

  const docTitle = targetSpecId && targetNom
    ? `*FACTURE ${targetNom.toUpperCase()} N° ${idCourt}*`
    : `*FACTURE N° ${idCourt}*`

  const recapTitle = targetSpecId && targetNom
    ? `📊 *RÉSUMÉ FINANCIER (${targetNom.toUpperCase()})*`
    : `📊 *RÉCAPITULATIF CONSOLIDÉ DES REMBOURSEMENTS*`

  return (
`${docTitle}
🏛️ *${gieName.toUpperCase()}*
───────────────────
👤 *Membre :* ${nomMembre}${codeMembre ? ` (${codeMembre})` : ''}
${village ? `📍 *Village :* ${village}\n` : ''}🌱 *Campagne :* ${nomCampagne}
📅 *Date d'émission :* ${new Date().toLocaleDateString('fr-FR')}
${culturesBlock}
${specDetailsBlock}${recapConsolideBlock}${specRembWhatsAppBlock}━━━━━━━━━━━━━━━━━━━
${recapTitle}
━━━━━━━━━━━━━━━━━━━
• Fournitures & Crédits : ${formatFactureAmount(montantTotal)}${unitStr}
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
 * Imprimé individuel enrichi : détail par spéculation et récapitulatif consolidé par intrant.
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

    const [distRes, ciRes, cmRes, specList, memSpecsRes, creditsRes, rembRes] = await Promise.all([
      supabase
        .from('distribution_intrants')
        .select(`
          id,
          intrant_id,
          quantite,
          speculation_id,
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
        .from('campagne_membre_speculations')
        .select('*')
        .eq('campagne_id', campagneId)
        .eq('membre_id', membreId),
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

    // Récupération des parcelles du membre
    const rawParcelles = (memSpecsRes?.data && memSpecsRes.data.length > 0)
      ? memSpecsRes.data
      : extraireParcellesObservations(cmRes?.data?.observations)

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

  if (targetSpecId) {
    const matched = memberParcelles.find((p: any) => p.speculationId === targetSpecId)
    if (matched) {
      memberParcelles = [matched]
      targetNom = matched.nom
    } else {
      const sObj = speculations.find((s: any) => s.id === targetSpecId)
      if (sObj) targetNom = sObj.nom
    }
  }

  const totalMemberSuperficie = memberParcelles.reduce((sum, p) => sum + (Number(p.superficie) || 0), 0)

  // 1. Regroupement consolidé par intrant (Toutes Spéculations Confondues)
  const groupedConsolide = new Map<string, {
    nom: string
    type_intrant: string
    quantite_totale: number
    prix_unitaire: number
    total: number
  }>()

  distributions.forEach((d: any) => {
    const intrant = Array.isArray(d.intrants) ? d.intrants[0] : d.intrants
    if (intrant?.nom) {
      const key = `${intrant.nom}___${intrant.type_intrant || ''}`
      const prix = Number(d.prix_facturation ?? intrant.prix_facturation ?? (intrant.prix_unitaire || 0))
      const qte = Number(d.quantite || 0)
      if (!groupedConsolide.has(key)) {
        groupedConsolide.set(key, {
          nom: intrant.nom,
          type_intrant: intrant.type_intrant || 'Intrant',
          quantite_totale: 0,
          prix_unitaire: prix,
          total: 0,
        })
      }
      const item = groupedConsolide.get(key)!
      item.quantite_totale += qte
      item.total += qte * prix
    }
  })
  let intrantsConsolides = Array.from(groupedConsolide.values())

  // 2. Ventilation des intrants et crédits par spéculation
  const specBreakdowns = memberParcelles.map((p) => {
    const ratio = totalMemberSuperficie > 0 ? Number(p.superficie) / totalMemberSuperficie : 1 / memberParcelles.length
    const items: Array<{ nom: string; type_intrant: string; quantite: number; prix: number; total: number }> = []

    distributions.forEach((d: any) => {
      const intrant = Array.isArray(d.intrants) ? d.intrants[0] : d.intrants
      if (!intrant?.nom) return
      const prix = Number(d.prix_facturation ?? intrant.prix_facturation ?? (intrant.prix_unitaire || 0))
      const qteTotal = Number(d.quantite || 0)

      if (d.speculation_id && d.speculation_id === p.speculationId) {
        items.push({
          nom: intrant.nom,
          type_intrant: intrant.type_intrant || 'Intrant',
          quantite: qteTotal,
          prix,
          total: qteTotal * prix,
        })
      } else if (!d.speculation_id) {
        // Ventilation au prorata de la superficie
        const qAlloc = Math.round(qteTotal * ratio * 100) / 100
        if (qAlloc > 0) {
          items.push({
            nom: intrant.nom,
            type_intrant: intrant.type_intrant || 'Intrant',
            quantite: qAlloc,
            prix,
            total: Math.round(qAlloc * prix),
          })
        }
      }
    })

    const creditsSpec = credits.filter((c: any) => {
      const sId = getCreditSpeculationId(c)
      const sNom = getCreditSpeculationNom(c)
      if (sId && sId === p.speculationId) return true
      if (sNom && sNom.toLowerCase() === p.nom.toLowerCase()) return true
      return false
    })

    const itemsTotal = items.reduce((sum, it) => sum + it.total, 0)
    const creditsTotal = creditsSpec.reduce((sum, c) => sum + Number(c.montant_demande || c.montant_accorde || 0), 0)

    return {
      ...p,
      items,
      credits: creditsSpec,
      subTotal: itemsTotal + creditsTotal,
    }
  })

  if (targetSpecId && specBreakdowns.length > 0) {
    intrantsConsolides = specBreakdowns[0].items.map((it) => ({
      nom: it.nom,
      type_intrant: it.type_intrant,
      quantite_totale: it.quantite,
      prix_unitaire: it.prix,
      total: it.total,
    }))
    credits = specBreakdowns[0].credits
  }

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const nomMembre = `${membreDetails?.prenom || ''} ${membreDetails?.nom || ''}`.trim() || 'Membre'
  const nomCampagne = facture.campagne?.nom || 'N/A'
  let montantInteret = Number(facture.montant_interet || 0)
  let montantTotal = Number(facture.montant_total || 0)
  let totalDu = montantTotal + montantInteret
  let resteAPayer = totalDu - (facture.montant_paye || 0)

  // 3. Suivi individuel des remboursements par spéculation d'abord
  let rembParSpecList: any[] = facture.remboursements_par_speculation || []
  if (rembParSpecList.length === 0 && memberParcelles.length > 0) {
    const fRembList = remboursementsList
    const specAccMap = new Map<string, {
      speculation_id: string
      nom: string
      variete: string | null
      superficie: number
      casier: string | null
      prix_collecte: number
      produit_collecte: string | null
      unite_mesure: string
      ratio: number
      montant_du: number
      quantite_nature: number
      valeur_nature: number
      montant_numeraire: number
    }>()

    let allocatedDuSum = 0
    memberParcelles.forEach((p: any, idx: number) => {
      const specObj = speculations.find((s: any) => s.id === p.speculationId)
      const nom = specObj?.nom || p.nom || 'Culture'
      const ratio = totalMemberSuperficie > 0 ? (Number(p.superficie) || 0) / totalMemberSuperficie : 1 / memberParcelles.length
      let mDu = Math.round(totalDu * ratio)
      if (idx === memberParcelles.length - 1) {
        mDu = Math.max(0, totalDu - allocatedDuSum)
      } else {
        allocatedDuSum += mDu
      }

      specAccMap.set(p.speculationId, {
        speculation_id: p.speculationId,
        nom,
        variete: p.variete || null,
        superficie: Number(p.superficie || 0),
        casier: p.casier || null,
        prix_collecte: Number(p.prixCollecte || 0),
        produit_collecte: p.produitCollecte || nom,
        unite_mesure: p.uniteMesure || 'kg',
        ratio,
        montant_du: mDu,
        quantite_nature: 0,
        valeur_nature: 0,
        montant_numeraire: 0,
      })
    })

    let nonVentileMonetaire = 0
    let sumDetails = 0

    for (const r of fRembList) {
      const montant = Number(r.montant_fcfa || 0)
      sumDetails += montant
      const qte = r.quantite_nature != null ? Number(r.quantite_nature) : null
      const rawMode = String(r.type_remboursement || '').toLowerCase()
      const isNature = rawMode === 'nature'

      const specTag = extraireTagSpeculation(r.produit_nature)
      let matchedSpecId: string | null = null

      if ((r as any).speculation_id && specAccMap.has((r as any).speculation_id)) {
        matchedSpecId = (r as any).speculation_id
      } else if (specTag) {
        for (const [sId, sData] of specAccMap.entries()) {
          if (sData.nom.toLowerCase() === specTag.toLowerCase()) {
            matchedSpecId = sId
            break
          }
        }
      } else if (isNature && r.produit_nature) {
        const prodLower = String(r.produit_nature).toLowerCase()
        for (const [sId, sData] of specAccMap.entries()) {
          if (sData.produit_collecte && prodLower.includes(sData.produit_collecte.toLowerCase())) {
            matchedSpecId = sId
            break
          }
          if (prodLower.includes(sData.nom.toLowerCase())) {
            matchedSpecId = sId
            break
          }
        }
      }

      if (isNature) {
        const targetId = matchedSpecId || memberParcelles[0]?.speculationId
        if (targetId && specAccMap.has(targetId)) {
          const acc = specAccMap.get(targetId)!
          const qVal = qte || 0
          const val = montant > 0 ? montant : qVal * acc.prix_collecte
          acc.quantite_nature += qVal
          acc.valeur_nature += val
        }
      } else {
        if (matchedSpecId && specAccMap.has(matchedSpecId)) {
          specAccMap.get(matchedSpecId)!.montant_numeraire += montant
        } else {
          nonVentileMonetaire += montant
        }
      }
    }

    const mPaye = Number(facture.montant_paye || 0)
    if (mPaye > sumDetails) {
      nonVentileMonetaire += (mPaye - sumDetails)
    }

    for (const acc of specAccMap.values()) {
      const partNonVentilee = Math.round(nonVentileMonetaire * acc.ratio)
      acc.montant_numeraire += partNonVentilee
    }

    rembParSpecList = Array.from(specAccMap.values()).map((acc) => {
      const montantRembourse = acc.valeur_nature + acc.montant_numeraire
      const solde = acc.montant_du - montantRembourse
      const taux = acc.montant_du > 0 ? Math.min(100, Math.round((montantRembourse / acc.montant_du) * 100)) : 100
      let statutSolde: 'solde' | 'excedent' | 'reliquat' = 'solde'
      if (solde > 0) statutSolde = 'reliquat'
      else if (solde < 0) statutSolde = 'excedent'

      return {
        speculation_id: acc.speculation_id,
        nom: acc.nom,
        variete: acc.variete,
        superficie: acc.superficie,
        casier: acc.casier,
        prix_collecte: acc.prix_collecte,
        produit_collecte: acc.produit_collecte,
        unite_mesure: acc.unite_mesure,
        montant_du: acc.montant_du,
        quantite_nature: acc.quantite_nature,
        valeur_nature: acc.valeur_nature,
        montant_numeraire: acc.montant_numeraire,
        montant_rembourse: montantRembourse,
        taux_recouvrement: taux,
        solde,
        statut_solde: statutSolde,
      }
    })
  }

  if (targetSpecId) {
    const matchedRemb = rembParSpecList.find((sp: any) => sp.speculation_id === targetSpecId)
    if (matchedRemb) {
      rembParSpecList = [matchedRemb]
      montantTotal = Number(matchedRemb.montant_du || 0)
      totalDu = montantTotal
      montantInteret = 0
      resteAPayer = Number(matchedRemb.solde || 0)
      facture = {
        ...facture,
        montant_paye: Number(matchedRemb.montant_rembourse || 0),
        montant_total: montantTotal,
      }
      if (!targetNom) targetNom = matchedRemb.nom
    }
  }

  // En-tête officiel
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(45, 106, 79)
  const gieLines = doc.splitTextToSize(gieName, 115)
  doc.text(gieLines, 14, gieLines.length > 1 ? 22 : 27)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(targetSpecId && targetNom ? 13 : 20)
  doc.setTextColor(160, 160, 160)
  doc.text(targetSpecId && targetNom ? `FACTURE - ${targetNom.toUpperCase()}` : 'FACTURE', pageWidth - 14, 27, { align: 'right' })

  // Ligne de séparation
  doc.setDrawColor(45, 106, 79)
  doc.setLineWidth(0.5)
  doc.line(14, 38, pageWidth - 14, 38)

  // Informations Facture
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
    doc.text(`Spéculation : ${targetNom} (${memberParcelles[0]?.superficie || 0} ha)`, 14, 63.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(70, 70, 70)
  }

  // Facturé à (Client)
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

  // Bandeau récapitulatif des spéculations du membre
  let nextY = 68
  if (memberParcelles.length > 0) {
    doc.setFillColor(240, 248, 244)
    doc.setDrawColor(180, 220, 200)
    doc.setLineWidth(0.4)
    doc.roundedRect(14, 67, pageWidth - 28, 14, 1.5, 1.5, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(35, 90, 65)
    doc.text('🌾 SPÉCULATIONS & PARCELLES EXPLOITÉES PAR LE PRODUCTEUR :', 18, 72.5)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(40, 60, 50)
    const specStr = memberParcelles
      .map((p) => `${p.nom}${p.variete ? ` (${p.variete})` : ''} : ${p.superficie.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ha${p.casier ? ` [Casier ${p.casier}]` : ''}`)
      .join('   •   ')
    const totalSurfStr = `Total : ${totalMemberSuperficie.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ha`
    doc.text(`• ${specStr}    |    ${totalSurfStr}`, 18, 77.5)

    nextY = 85
  }

  // TABLEAU 1 : DÉTAIL DES DOTATIONS PAR SPÉCULATION
  const specTableBody: any[] = []
  specBreakdowns.forEach((sd) => {
    specTableBody.push([
      {
        content: `🌾 Culture : ${sd.nom.toUpperCase()} (${sd.superficie.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ha${sd.casier ? ` - Casier: ${sd.casier}` : ''})`,
        colSpan: 4,
        styles: {
          fillColor: [232, 245, 238],
          textColor: [35, 90, 65],
          fontStyle: 'bold',
          fontSize: 8.5,
        },
      },
    ])
    if (sd.items.length === 0 && sd.credits.length === 0) {
      specTableBody.push([
        '    Dotation générale proportionnelle',
        '-',
        '-',
        '-',
      ])
    }
    sd.items.forEach((item) => {
      specTableBody.push([
        `    • ${item.nom} (${item.type_intrant})`,
        item.quantite.toLocaleString('fr-FR', { maximumFractionDigits: 2 }),
        formatFactureAmount(item.prix),
        formatFactureAmount(item.total),
      ])
    })
    sd.credits.forEach((c: any) => {
      specTableBody.push([
        `    • Crédit : ${c.but_credit || 'Crédit campagne'}`,
        '-',
        '-',
        formatFactureAmount(Number(c.montant_demande || c.montant_accorde || 0)),
      ])
    })
    specTableBody.push([
      {
        content: `Sous-total ${sd.nom} :`,
        colSpan: 3,
        styles: { halign: 'right', fontStyle: 'bold', textColor: [35, 90, 65], fontSize: 8 },
      },
      {
        content: `${formatFactureAmount(sd.subTotal)}`,
        styles: { fontStyle: 'bold', halign: 'right', textColor: [35, 90, 65], fontSize: 8 },
      },
    ])
  })

  autoTable(doc, {
    startY: nextY,
    head: [[targetSpecId && targetNom ? `Détail des Dotations - Culture : ${targetNom.toUpperCase()}` : "Détail des Dotations par Spéculation", "Qté", "Prix Unit.", unite ? `Montant (${unite.trim()})` : "Montant"]],
    body: specTableBody,
    theme: 'striped',
    headStyles: {
      fillColor: [45, 106, 79],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 2,
      fontSize: 8.5,
    },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2,
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'right', cellWidth: 30 },
      3: { halign: 'right', cellWidth: 35, fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
  })

  // TABLEAU 2 : RÉCAPITULATIF CONSOLIDÉ PAR INTRANT (Toutes Spéculations Confondues)
  let recapStartY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 8 : 120
  if (recapStartY + 45 > pageHeight) {
    doc.addPage()
    recapStartY = 15
  }

  const recapTableBody: any[] = []
  intrantsConsolides.forEach((it) => {
    recapTableBody.push([
      it.nom,
      it.type_intrant,
      it.quantite_totale.toLocaleString('fr-FR', { maximumFractionDigits: 2 }),
      formatFactureAmount(it.prix_unitaire),
      formatFactureAmount(it.total),
    ])
  })

  credits.forEach((c: any) => {
    recapTableBody.push([
      `Crédit : ${c.but_credit || 'Crédit de campagne'}`,
      'Financement',
      '-',
      '-',
      formatFactureAmount(Number(c.montant_demande || c.montant_accorde || 0)),
    ])
  })

  if (recapTableBody.length === 0) {
    recapTableBody.push([
      'Fournitures & Crédits de campagne',
      'Global',
      '-',
      '-',
      formatFactureAmount(facture.montant_total),
    ])
  }

  autoTable(doc, {
    startY: recapStartY,
    head: [[
      targetSpecId && targetNom
        ? `RÉCAPITULATIF DES INTRANTS (Culture : ${targetNom.toUpperCase()})`
        : "RÉCAPITULATIF CONSOLIDÉ PAR INTRANT (Toutes Spéculations)",
      "Catégorie",
      "Qté Totale",
      "Prix Facturé",
      unite ? `Total (${unite.trim()})` : "Total",
    ]],
    body: recapTableBody,
    theme: 'striped',
    headStyles: {
      fillColor: [35, 75, 60],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 2,
      fontSize: 8.5,
    },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2,
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 'auto', fontStyle: 'bold' },
      1: { halign: 'left', cellWidth: 26 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'right', cellWidth: 26 },
      4: { halign: 'right', cellWidth: 35, fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
  })

  // TABLEAU 3 : SUIVI DES RÈGLEMENTS & SOLDES PAR SPÉCULATION (D'ABORD)
  if (rembParSpecList && rembParSpecList.length > 0) {
    let rembStartY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 8 : 170
    if (rembStartY + 45 > pageHeight) {
      doc.addPage()
      rembStartY = 15
    }

    const rembTableBody: any[] = []
    rembParSpecList.forEach((sp: any) => {
      const appNature = sp.quantite_nature > 0
        ? `${formatFactureAmount(sp.valeur_nature)} (${Number(sp.quantite_nature).toLocaleString('fr-FR')} ${sp.unite_mesure || 'kg'})`
        : '-'
      const soldeStr = sp.solde > 0
        ? `${formatFactureAmount(sp.solde)}`
        : sp.solde < 0
        ? `+${formatFactureAmount(Math.abs(sp.solde))}`
        : 'Soldé'

      rembTableBody.push([
        sp.variete ? `${sp.nom} (${sp.variete})` : sp.nom,
        Number(sp.superficie || 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 }),
        formatFactureAmount(sp.montant_du),
        appNature,
        formatFactureAmount(sp.montant_numeraire),
        formatFactureAmount(sp.montant_rembourse),
        `${sp.taux_recouvrement ?? 0}%`,
        soldeStr,
      ])
    })

    autoTable(doc, {
      startY: rembStartY,
      head: [[
        targetSpecId && targetNom
          ? `SUIVI DU RÈGLEMENT (${targetNom.toUpperCase()})`
          : "SUIVI DES RÈGLEMENTS PAR SPÉCULATION",
        "Ha",
        "Montant Dû",
        "Apport Nature",
        "Numéraire",
        "Total Réglé",
        "Taux",
        unite ? `Solde (${unite.trim()})` : "Solde",
      ]],
      body: rembTableBody,
      theme: 'striped',
      headStyles: {
        fillColor: [30, 90, 70],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'left',
        cellPadding: 2,
        fontSize: 8,
      },
      styles: {
        font: 'helvetica',
        fontSize: 7.5,
        cellPadding: 2,
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 'auto', fontStyle: 'bold' },
        1: { halign: 'center', cellWidth: 14 },
        2: { halign: 'right', cellWidth: 24 },
        3: { halign: 'right', cellWidth: 32 },
        4: { halign: 'right', cellWidth: 22 },
        5: { halign: 'right', cellWidth: 25, fontStyle: 'bold' },
        6: { halign: 'center', cellWidth: 14 },
        7: { halign: 'right', cellWidth: 26, fontStyle: 'bold' },
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
    })
  }

  // Récapitulatif financier consolidé & Solde
  const tableEndY = (doc as any).lastAutoTable?.finalY || 140
  const footerBlockHeight = 85
  let finalY = tableEndY
  if (finalY + footerBlockHeight > pageHeight) {
    doc.addPage()
    finalY = 15
  }

  const totalBoxX = pageWidth - 85
  doc.setDrawColor(220, 220, 220)
  doc.line(totalBoxX, finalY + 4, pageWidth - 14, finalY + 4)

  let ty = finalY + 9.5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(80, 80, 80)

  doc.text('Fournitures & Crédits :', totalBoxX, ty)
  doc.text(`${formatFactureAmount(montantTotal)}`, pageWidth - 14, ty, { align: 'right' })
  ty += 5

  if (montantInteret > 0) {
    doc.text('Intérêts de campagne :', totalBoxX, ty)
    doc.text(`${formatFactureAmount(montantInteret)}`, pageWidth - 14, ty, { align: 'right' })
    ty += 5
  }

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('TOTAL GÉNÉRAL DÛ :', totalBoxX, ty)
  doc.text(`${formatFactureAmount(totalDu)} ${unite}`, pageWidth - 14, ty, { align: 'right' })
  ty += 5

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(45, 106, 79)
  doc.text('Total Déjà Réglé :', totalBoxX, ty)
  doc.text(`-${formatFactureAmount(facture.montant_paye || 0)} ${unite}`, pageWidth - 14, ty, { align: 'right' })
  ty += 3.5

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
    doc.text(`${formatFactureAmount(Math.abs(resteAPayer))} ${unite}`, pageWidth - 14, ty, { align: 'right' })
  } else {
    doc.setTextColor(220, 38, 38)
    doc.text('RESTE À PAYER :', totalBoxX, ty)
    doc.text(`${formatFactureAmount(resteAPayer)} ${unite}`, pageWidth - 14, ty, { align: 'right' })
  }

  // Modalités de remboursement à gauche
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(0, 0, 0)
  doc.text('Modalités de remboursement :', 14, finalY + 9.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(90, 90, 90)
  doc.text('• Modes acceptés : Espèces, Chèque bancaire, Bon de livraison, Nature', 14, finalY + 14.5)

  let my = finalY + 19.5
  if (resteAPayer > 0 && memberParcelles.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(35, 90, 65)
    doc.text('Équivalents en nature pour solder cette facture :', 14, my)
    my += 4
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(90, 90, 90)

    memberParcelles.forEach((p) => {
      if (p.prixCollecte > 0) {
        const qteKg = (resteAPayer / p.prixCollecte).toFixed(1)
        doc.text(`  - ${p.produitCollecte || p.nom} : ${qteKg} kg (sur la base de ${p.prixCollecte} ${unite}/kg)`, 14, my)
        my += 3.8
      }
    })
  }

  // Mentions
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7.5)
  doc.setTextColor(140, 140, 140)
  doc.text('Merci de conserver cette facture précieusement pour vos bilans.', 14, finalY + 44)

  // Signature Box
  doc.setDrawColor(200, 200, 200)
  doc.setLineDashPattern([2, 2], 0)
  doc.rect(pageWidth - 70, finalY + 44, 56, 22)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(80, 80, 80)
  doc.text('Cachet et Signature du GIE', pageWidth - 67, finalY + 49)

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
    memberParcelles,
    intrantsConsolides,
    specBreakdowns,
    remboursementsParSpeculation: rembParSpecList,
    totalDu,
    resteAPayer,
    quantiteNature: memberParcelles.length > 0 && memberParcelles[0].prixCollecte > 0 && resteAPayer > 0
      ? `${(resteAPayer / memberParcelles[0].prixCollecte).toFixed(1)} kg de ${memberParcelles[0].produitCollecte || memberParcelles[0].nom}`
      : 'N/A',
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

