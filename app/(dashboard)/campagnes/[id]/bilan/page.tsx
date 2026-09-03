import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { ArrowLeft, Users, PackageOpen, Banknote, BarChart3, TrendingUp } from 'lucide-react'
import { Fragment } from 'react'
import PrintSectionButton from './PrintSectionButton'

export const dynamic = 'force-dynamic'

export default async function BilanCampagnePage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params
  
  // 1. Fetch Campaign
  const { data: campagne } = await supabase
    .from('campagnes')
    .select('*')
    .eq('id', id)
    .single()

  if (!campagne) {
    return <div>Campagne introuvable.</div>
  }

  // 2. Counts (Members)
  const { count: totalMembresGie } = await supabase
    .from('membres')
    .select('*', { count: 'exact', head: true })

  const { data: enrolledData } = await supabase
    .from('campagne_membres')
    .select('membre_id')
    .eq('campagne_id', id)
    
  const totalInscrits = enrolledData?.length || 0

  // 3. Campaign Inputs (Prices)
  const { data: campagneIntrantsData } = await supabase
    .from('campagne_intrants')
    .select(`
      intrant_id, 
      prix_facturation, 
      intrants (nom, type_intrant, prix_unitaire)
    `)
    .eq('campagne_id', id)
    
  const campagneIntrants = campagneIntrantsData || []
  const intrantPriceMap = new Map<string, number>()
  const intrantInfoMap = new Map<string, { nom: string, type_intrant: string, prix_unitaire: number }>()
  
  campagneIntrants.forEach((ci: any) => {
    intrantPriceMap.set(ci.intrant_id, Number(ci.prix_facturation))
    intrantInfoMap.set(ci.intrant_id, ci.intrants)
  })

  // Prepare column definitions for Pivot Table
  const intrantsList = Array.from(intrantInfoMap.entries()).map(([iId, info]) => ({
    id: iId,
    nom: info.nom,
    prix_facturation: intrantPriceMap.get(iId) || 0
  }))

  // 4. Distributions
  const { data: distributionsData } = await supabase
    .from('distribution_intrants')
    .select(`
      id,
      membre_id, 
      intrant_id, 
      quantite, 
      membres (prenom, nom, code_membre)
    `)
    .eq('campagne_id', id)

  const distributions = distributionsData || []

  // 5. Factures / Remboursements
  const { data: facturesData } = await supabase
    .from('factures')
    .select('membre_id, montant_paye')
    .eq('campagne_id', id)
    
  const rembMap = new Map<string, number>()
  if (facturesData) {
    facturesData.forEach(f => {
      rembMap.set(f.membre_id, (rembMap.get(f.membre_id) || 0) + Number(f.montant_paye))
    })
  }

  // --- Compute KPIs ---
  let totalValeurDistribuee = 0
  let totalCoutAchat = 0
  const membresServis = new Set<string>()

  // --- Compute By Product ---
  const productStats = new Map<string, { 
    quantite: number, 
    valeurFacturee: number, 
    valeurAchat: number,
    beneficiaires: Set<string> 
  }>()

  // --- Compute By Member (Debt & Pivot) ---
  const memberDebt = new Map<string, {
    info: any,
    totalDette: number,
    produitsCount: number,
    intrants: Record<string, { quantite: number, montant: number }>
  }>()

  distributions.forEach((d: any) => {
    const qte = Number(d.quantite)
    const prixFacturation = intrantPriceMap.get(d.intrant_id) || 0
    const prixAchat = intrantInfoMap.get(d.intrant_id)?.prix_unitaire || 0
    
    const valeurFact = qte * prixFacturation
    const valeurAchat = qte * prixAchat

    // KPIs
    totalValeurDistribuee += valeurFact
    totalCoutAchat += valeurAchat
    membresServis.add(d.membre_id)

    // By Product
    if (!productStats.has(d.intrant_id)) {
      productStats.set(d.intrant_id, { quantite: 0, valeurFacturee: 0, valeurAchat: 0, beneficiaires: new Set() })
    }
    const pStat = productStats.get(d.intrant_id)!
    pStat.quantite += qte
    pStat.valeurFacturee += valeurFact
    pStat.valeurAchat += valeurAchat
    pStat.beneficiaires.add(d.membre_id)

    // By Member
    if (!memberDebt.has(d.membre_id)) {
      memberDebt.set(d.membre_id, { info: d.membres, totalDette: 0, produitsCount: 0, intrants: {} })
    }
    const mDebt = memberDebt.get(d.membre_id)!
    mDebt.totalDette += valeurFact
    mDebt.produitsCount += qte
    if (!mDebt.intrants[d.intrant_id]) {
      mDebt.intrants[d.intrant_id] = { quantite: 0, montant: 0 }
    }
    mDebt.intrants[d.intrant_id].quantite += qte
    mDebt.intrants[d.intrant_id].montant += valeurFact
  })

  const totalMembresServis = membresServis.size
  const margeNette = totalValeurDistribuee - totalCoutAchat

  // Convert Maps to Arrays for rendering
  const productList = Array.from(productStats.entries()).map(([iId, stats]) => {
    const prixAchat = intrantInfoMap.get(iId)?.prix_unitaire || 0
    const prixFact = intrantPriceMap.get(iId) || 0
    return {
      id: iId,
      info: intrantInfoMap.get(iId),
      prix_achat: prixAchat,
      prix_facturation: prixFact,
      marge_unitaire: prixFact - prixAchat,
      quantite: stats.quantite,
      valeur_facturee: stats.valeurFacturee,
      marge_totale: stats.valeurFacturee - stats.valeurAchat,
      beneficiaires: stats.beneficiaires.size
    }
  }).sort((a, b) => b.valeur_facturee - a.valeur_facturee) // Sort by value desc

  const memberList = Array.from(memberDebt.entries()).map(([mId, data]) => {
    const remboursement = rembMap.get(mId) || 0
    const solde = data.totalDette - remboursement
    return {
      id: mId,
      remboursement,
      solde,
      ...data
    }
  }).sort((a, b) => b.totalDette - a.totalDette) // Sort by debt desc

  return (
    <div className="space-y-8">
      <div>
        <Link href="/campagnes" className="text-sm font-medium text-primary hover:text-primary-hover flex items-center gap-1 mb-6">
          <ArrowLeft className="h-4 w-4" /> Retour aux campagnes
        </Link>
        <div className="sm:flex sm:items-center justify-between border-b border-surface-border pb-6">
          <div className="sm:flex-auto">
            <h2 className="text-2xl font-bold font-heading text-foreground">
              Bilan : {campagne.nom}
            </h2>
            <p className="mt-2 text-sm text-foreground-muted">
              Statistiques des distributions, valorisation financière, état des marges et dettes théoriques.
            </p>
          </div>
          <div className="mt-4 sm:ml-16 sm:mt-0">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
              campagne.statut === 'en_cours' ? 'bg-primary/10 text-primary' : 
              campagne.statut === 'terminee' ? 'bg-success/10 text-success' : 'bg-secondary/10 text-secondary'
            }`}>
              {campagne.statut.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="overflow-hidden rounded-lg bg-surface p-4 shadow-sm border border-surface-border flex flex-col items-center justify-center text-center gap-1 hover:border-primary transition-colors cursor-default">
          <div className="rounded-md bg-secondary/20 p-2 shrink-0">
            <Users className="h-5 w-5 text-secondary" aria-hidden="true" />
          </div>
          <div className="w-full mt-1">
            <dt className="text-xs font-medium text-foreground-muted min-h-[2rem] flex items-center justify-center leading-tight">Membres Inscrits</dt>
            <dd className="mt-1 text-lg font-bold tracking-tight text-foreground">
              {totalInscrits} <span className="text-xs font-normal text-foreground-muted">/ {totalMembresGie}</span>
            </dd>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-surface p-4 shadow-sm border border-surface-border flex flex-col items-center justify-center text-center gap-1 hover:border-primary transition-colors cursor-default">
          <div className="rounded-md bg-primary/20 p-2 shrink-0">
            <PackageOpen className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div className="w-full mt-1">
            <dt className="text-xs font-medium text-foreground-muted min-h-[2rem] flex items-center justify-center leading-tight">Servis</dt>
            <dd className="mt-1 text-lg font-bold tracking-tight text-foreground">
              {totalMembresServis} <span className="text-xs font-normal text-foreground-muted">membres</span>
            </dd>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-surface p-4 shadow-sm border border-surface-border flex flex-col items-center justify-center text-center gap-1 hover:border-primary transition-colors cursor-default">
          <div className="rounded-md bg-success/20 p-2 shrink-0">
            <Banknote className="h-5 w-5 text-success" aria-hidden="true" />
          </div>
          <div className="w-full mt-1">
            <dt className="text-xs font-medium text-foreground-muted min-h-[2rem] flex items-center justify-center leading-tight">Total Facturé</dt>
            <dd className="mt-1 text-lg font-bold tracking-tight text-foreground">
              {totalValeurDistribuee.toLocaleString('fr-FR')} <span className="text-xs font-normal text-foreground-muted">FCFA</span>
            </dd>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-surface p-4 shadow-sm border border-surface-border flex flex-col items-center justify-center text-center gap-1 hover:border-primary transition-colors cursor-default">
          <div className="rounded-md bg-warning/20 p-2 shrink-0">
            <TrendingUp className="h-5 w-5 text-warning" aria-hidden="true" />
          </div>
          <div className="w-full mt-1">
            <dt className="text-xs font-medium text-foreground-muted min-h-[2rem] flex items-center justify-center leading-tight">Marge Nette</dt>
            <dd className={`mt-1 text-lg font-bold tracking-tight ${margeNette >= 0 ? 'text-success' : 'text-danger'}`}>
              {margeNette > 0 ? '+' : ''}{margeNette.toLocaleString('fr-FR')} <span className="text-xs font-normal text-foreground-muted">FCFA</span>
            </dd>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-surface p-4 shadow-sm border border-surface-border flex flex-col items-center justify-center text-center gap-1 hover:border-primary transition-colors cursor-default">
          <div className="rounded-md bg-info/20 p-2 shrink-0">
            <BarChart3 className="h-5 w-5 text-info" aria-hidden="true" />
          </div>
          <div className="w-full mt-1">
            <dt className="text-xs font-medium text-foreground-muted min-h-[2rem] flex items-center justify-center leading-tight">Opérations</dt>
            <dd className="mt-1 text-lg font-bold tracking-tight text-foreground">
              {distributions.length} <span className="text-xs font-normal text-foreground-muted">saisies</span>
            </dd>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Table By Product */}
        <div className="flow-root" id="section-produits">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold leading-6 text-foreground">État de Marge par Intrant</h3>
              <p className="mt-1 text-sm text-foreground-muted">Comparaison entre les prix d'achat et les prix de facturation.</p>
            </div>
            <PrintSectionButton sectionId="section-produits" />
          </div>
          <div className="overflow-hidden overflow-x-auto shadow ring-1 ring-surface-border sm:rounded-lg bg-surface">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-surface-border">
                <thead className="bg-background/50">
                  <tr>
                    <th scope="col" className="py-3 pl-4 pr-3 text-left text-sm font-semibold text-foreground">Produit</th>
                    <th scope="col" className="px-3 py-3 text-right text-sm font-semibold text-foreground">Prix Achat</th>
                    <th scope="col" className="px-3 py-3 text-right text-sm font-semibold text-foreground">Prix Facturé</th>
                    <th scope="col" className="px-3 py-3 text-right text-sm font-semibold text-foreground">Marge/U</th>
                    <th scope="col" className="px-3 py-3 text-right text-sm font-semibold text-foreground">Total Qté</th>
                    <th scope="col" className="px-3 py-3 text-right text-sm font-semibold text-foreground">Marge Globale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border bg-surface">
                  {productList.length > 0 ? (
                    productList.map((p) => (
                      <tr key={p.id} className="hover:bg-background/50 transition-colors">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-foreground">
                          {p.info?.nom}
                          <div className="text-xs text-foreground-muted capitalize">{p.info?.type_intrant}</div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground-muted text-right">
                          {p.prix_achat.toLocaleString('fr-FR')}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-primary font-medium text-right">
                          {p.prix_facturation.toLocaleString('fr-FR')}
                        </td>
                        <td className={`whitespace-nowrap px-3 py-4 text-sm font-medium text-right ${p.marge_unitaire >= 0 ? 'text-success' : 'text-danger'}`}>
                          {p.marge_unitaire > 0 ? '+' : ''}{p.marge_unitaire.toLocaleString('fr-FR')}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm font-semibold text-foreground text-right">
                          {p.quantite}
                        </td>
                        <td className={`whitespace-nowrap px-3 py-4 text-sm font-semibold text-right ${p.marge_totale >= 0 ? 'text-success' : 'text-danger'}`}>
                          {p.marge_totale > 0 ? '+' : ''}{p.marge_totale.toLocaleString('fr-FR')}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="whitespace-nowrap py-8 text-center text-sm text-foreground-muted">
                        Aucune distribution enregistrée pour cette campagne.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Table By Member (Summary) */}
        <div className="flow-root" id="section-dettes">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold leading-6 text-foreground">Dettes et Remboursements par Membre</h3>
              <p className="mt-1 text-sm text-foreground-muted">Suivi des dettes facturées et des remboursements effectués.</p>
            </div>
            <PrintSectionButton sectionId="section-dettes" />
          </div>
          <div className="overflow-hidden overflow-x-auto shadow ring-1 ring-surface-border sm:rounded-lg bg-surface">
            <div className="max-h-[500px] overflow-y-auto">
              <table className="min-w-full divide-y divide-surface-border relative">
                <thead className="bg-background/50 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th scope="col" className="py-3 pl-4 pr-3 text-left text-sm font-semibold text-foreground">Bénéficiaire</th>
                    <th scope="col" className="px-3 py-3 text-right text-sm font-semibold text-foreground">Dette (FCFA)</th>
                    <th scope="col" className="px-3 py-3 text-right text-sm font-semibold text-foreground">Remboursement</th>
                    <th scope="col" className="px-3 py-3 text-right text-sm font-semibold text-foreground">Solde</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border bg-surface">
                  {memberList.length > 0 ? (
                    memberList.map((m) => (
                      <tr key={m.id} className="hover:bg-background/50 transition-colors">
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-foreground">
                          {m.info?.prenom} {m.info?.nom}
                          <div className="text-xs text-foreground-muted">{m.info?.code_membre}</div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm font-semibold text-foreground text-right">
                          {m.totalDette.toLocaleString('fr-FR')}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm font-semibold text-success text-right">
                          {m.remboursement.toLocaleString('fr-FR')}
                        </td>
                        <td className={`whitespace-nowrap px-3 py-4 text-sm font-bold text-right ${m.solde > 0 ? 'text-danger' : m.solde < 0 ? 'text-info' : 'text-success'}`}>
                          {m.solde === 0 ? 'Soldé' : m.solde.toLocaleString('fr-FR')}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="whitespace-nowrap py-8 text-center text-sm text-foreground-muted">
                        Aucun membre n'a encore reçu d'intrants.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Table État des Livraisons (Matrix) */}
      <div className="flow-root mt-12" id="section-livraisons">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold leading-6 text-foreground">État des Livraisons par Membre</h3>
            <p className="mt-1 text-sm text-foreground-muted">Récapitulatif détaillé des quantités et montants livrés à chaque membre pour chaque intrant.</p>
          </div>
          <PrintSectionButton sectionId="section-livraisons" />
        </div>
        <div className="overflow-hidden shadow-sm ring-1 ring-surface-border sm:rounded-lg bg-surface">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-surface-border text-sm">
              <thead className="bg-background/50">
                <tr>
                  <th scope="col" rowSpan={2} className="py-3 pl-4 pr-3 text-left font-semibold text-foreground border-r border-surface-border align-bottom">
                    Bénéficiaire
                  </th>
                  {intrantsList.map(i => (
                    <th key={i.id} scope="col" colSpan={2} className="px-3 py-2 text-center font-semibold text-foreground border-r border-surface-border bg-primary/5">
                      {i.nom} <br/> 
                      <span className="text-xs font-normal text-foreground-muted">{i.prix_facturation.toLocaleString('fr-FR')} FCFA/u</span>
                    </th>
                  ))}
                  <th scope="col" rowSpan={2} className="px-3 py-3 text-right font-bold text-foreground align-bottom bg-background/80">
                    Total Global (FCFA)
                  </th>
                </tr>
                <tr>
                  {intrantsList.map(i => (
                    <Fragment key={i.id}>
                      <th scope="col" className="px-2 py-2 text-right font-medium text-foreground-muted border-t border-surface-border">Qté</th>
                      <th scope="col" className="px-2 py-2 text-right font-medium text-foreground-muted border-t border-r border-surface-border">Montant</th>
                    </Fragment>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border bg-surface">
                {memberList.length > 0 ? (
                  memberList.map((row) => (
                    <tr key={row.id} className="hover:bg-background/50 transition-colors">
                      <td className="whitespace-nowrap py-3 pl-4 pr-3 font-medium text-foreground border-r border-surface-border">
                        {row.info?.prenom} {row.info?.nom}
                        <div className="text-xs text-foreground-muted">{row.info?.code_membre}</div>
                      </td>
                      {intrantsList.map(i => {
                        const cell = row.intrants[i.id]
                        return (
                          <Fragment key={i.id}>
                            <td className="whitespace-nowrap px-2 py-3 text-right text-foreground">
                              {cell?.quantite ? cell.quantite.toLocaleString('fr-FR') : '-'}
                            </td>
                            <td className="whitespace-nowrap px-2 py-3 text-right text-foreground border-r border-surface-border">
                              {cell?.montant ? cell.montant.toLocaleString('fr-FR') : '-'}
                            </td>
                          </Fragment>
                        )
                      })}
                      <td className="whitespace-nowrap px-3 py-3 text-right font-bold text-danger bg-background/30">
                        {row.totalDette.toLocaleString('fr-FR')}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={intrantsList.length * 2 + 2} className="whitespace-nowrap py-8 text-center text-foreground-muted">
                      Aucune livraison enregistrée pour cette campagne.
                    </td>
                  </tr>
                )}
                
                {/* Total Row */}
                {memberList.length > 0 && (
                  <tr className="bg-background/80 font-bold border-t-2 border-surface-border">
                    <td className="whitespace-nowrap py-3 pl-4 pr-3 text-right text-foreground border-r border-surface-border">
                      TOTAL GÉNÉRAL
                    </td>
                    {intrantsList.map(i => {
                      const totalQte = memberList.reduce((sum, row) => sum + (row.intrants[i.id]?.quantite || 0), 0)
                      const totalMnt = memberList.reduce((sum, row) => sum + (row.intrants[i.id]?.montant || 0), 0)
                      return (
                        <Fragment key={i.id}>
                          <td className="whitespace-nowrap px-2 py-3 text-right text-foreground">
                            {totalQte.toLocaleString('fr-FR')}
                          </td>
                          <td className="whitespace-nowrap px-2 py-3 text-right text-foreground border-r border-surface-border text-success">
                            {totalMnt.toLocaleString('fr-FR')}
                          </td>
                        </Fragment>
                      )
                    })}
                    <td className="whitespace-nowrap px-3 py-3 text-right text-primary font-bold">
                      {memberList.reduce((sum, row) => sum + row.totalDette, 0).toLocaleString('fr-FR')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
