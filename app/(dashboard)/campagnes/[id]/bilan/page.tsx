import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { ArrowLeft, Users, PackageOpen, Banknote, BarChart3, TrendingUp } from 'lucide-react'
import { Fragment } from 'react'
import PrintSectionButton from './PrintSectionButton'
import { getDictionary, getLocale } from '@/dictionaries'

export const dynamic = 'force-dynamic'

export default async function BilanCampagnePage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const t = dict.campagnes_detail.bilan
  const dateLocale = locale === 'fr' ? 'fr-FR' : 'en-US'

  // 1. Fetch Campaign
  const { data: campagne } = await supabase
    .from('campagnes')
    .select('*')
    .eq('id', id)
    .single()

  if (!campagne) {
    return <div>{t.not_found}</div>
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
          <ArrowLeft className="h-4 w-4" /> {dict.campagnes_detail.back}
        </Link>
        <div className="sm:flex sm:items-center justify-between border-b border-surface-border pb-6">
          <div className="sm:flex-auto">
            <h2 className="text-2xl font-bold font-heading text-foreground">
              {t.title} {campagne.nom}
            </h2>
            <p className="mt-2 text-sm text-foreground-muted">
              {t.desc}
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
            <dt className="text-xs font-medium text-foreground-muted min-h-[2rem] flex items-center justify-center leading-tight">{t.kpis.enrolled}</dt>
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
            <dt className="text-xs font-medium text-foreground-muted min-h-[2rem] flex items-center justify-center leading-tight">{t.kpis.served}</dt>
            <dd className="mt-1 text-lg font-bold tracking-tight text-foreground">
              {totalMembresServis} <span className="text-xs font-normal text-foreground-muted">{t.kpis.served_unit}</span>
            </dd>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-surface p-4 shadow-sm border border-surface-border flex flex-col items-center justify-center text-center gap-1 hover:border-primary transition-colors cursor-default">
          <div className="rounded-md bg-success/20 p-2 shrink-0">
            <Banknote className="h-5 w-5 text-success" aria-hidden="true" />
          </div>
          <div className="w-full mt-1">
            <dt className="text-xs font-medium text-foreground-muted min-h-[2rem] flex items-center justify-center leading-tight">{t.kpis.total_billed}</dt>
            <dd className="mt-1 text-lg font-bold tracking-tight text-foreground">
              {totalValeurDistribuee.toLocaleString(dateLocale)} <span className="text-xs font-normal text-foreground-muted">FCFA</span>
            </dd>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-surface p-4 shadow-sm border border-surface-border flex flex-col items-center justify-center text-center gap-1 hover:border-primary transition-colors cursor-default">
          <div className="rounded-md bg-warning/20 p-2 shrink-0">
            <TrendingUp className="h-5 w-5 text-warning" aria-hidden="true" />
          </div>
          <div className="w-full mt-1">
            <dt className="text-xs font-medium text-foreground-muted min-h-[2rem] flex items-center justify-center leading-tight">{t.kpis.net_margin}</dt>
            <dd className={`mt-1 text-lg font-bold tracking-tight ${margeNette >= 0 ? 'text-success' : 'text-danger'}`}>
              {margeNette > 0 ? '+' : ''}{margeNette.toLocaleString(dateLocale)} <span className="text-xs font-normal text-foreground-muted">FCFA</span>
            </dd>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-surface p-4 shadow-sm border border-surface-border flex flex-col items-center justify-center text-center gap-1 hover:border-primary transition-colors cursor-default">
          <div className="rounded-md bg-info/20 p-2 shrink-0">
            <BarChart3 className="h-5 w-5 text-info" aria-hidden="true" />
          </div>
          <div className="w-full mt-1">
            <dt className="text-xs font-medium text-foreground-muted min-h-[2rem] flex items-center justify-center leading-tight">{t.kpis.operations}</dt>
            <dd className="mt-1 text-lg font-bold tracking-tight text-foreground">
              {distributions.length} <span className="text-xs font-normal text-foreground-muted">{t.kpis.operations_unit}</span>
            </dd>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Table By Product */}
        <div className="flow-root" id="section-produits">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold leading-6 text-foreground">{t.margin_section.title}</h3>
              <p className="mt-1 text-sm text-foreground-muted">{t.margin_section.desc}</p>
            </div>
            <PrintSectionButton sectionId="section-produits" label={t.print} />
          </div>
          <div className="overflow-hidden overflow-x-auto shadow ring-1 ring-surface-border sm:rounded-lg bg-surface">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-surface-border">
                <thead className="bg-background/50">
                  <tr>
                    <th scope="col" className="py-3 pl-4 pr-3 text-left text-sm font-semibold text-foreground">{t.margin_section.headers.product}</th>
                    <th scope="col" className="px-3 py-3 text-right text-sm font-semibold text-foreground">{t.margin_section.headers.buy_price}</th>
                    <th scope="col" className="px-3 py-3 text-right text-sm font-semibold text-foreground">{t.margin_section.headers.billed_price}</th>
                    <th scope="col" className="px-3 py-3 text-right text-sm font-semibold text-foreground">{t.margin_section.headers.unit_margin}</th>
                    <th scope="col" className="px-3 py-3 text-right text-sm font-semibold text-foreground">{t.margin_section.headers.total_qty}</th>
                    <th scope="col" className="px-3 py-3 text-right text-sm font-semibold text-foreground">{t.margin_section.headers.global_margin}</th>
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
                          {p.prix_achat.toLocaleString(dateLocale)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-primary font-medium text-right">
                          {p.prix_facturation.toLocaleString(dateLocale)}
                        </td>
                        <td className={`whitespace-nowrap px-3 py-4 text-sm font-medium text-right ${p.marge_unitaire >= 0 ? 'text-success' : 'text-danger'}`}>
                          {p.marge_unitaire > 0 ? '+' : ''}{p.marge_unitaire.toLocaleString(dateLocale)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm font-semibold text-foreground text-right">
                          {p.quantite}
                        </td>
                        <td className={`whitespace-nowrap px-3 py-4 text-sm font-semibold text-right ${p.marge_totale >= 0 ? 'text-success' : 'text-danger'}`}>
                          {p.marge_totale > 0 ? '+' : ''}{p.marge_totale.toLocaleString(dateLocale)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="whitespace-nowrap py-8 text-center text-sm text-foreground-muted">
                        {t.margin_section.empty}
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
              <h3 className="text-lg font-semibold leading-6 text-foreground">{t.debts_section.title}</h3>
              <p className="mt-1 text-sm text-foreground-muted">{t.debts_section.desc}</p>
            </div>
            <PrintSectionButton sectionId="section-dettes" label={t.print} />
          </div>
          <div className="overflow-hidden overflow-x-auto shadow ring-1 ring-surface-border sm:rounded-lg bg-surface">
            <div className="max-h-[500px] overflow-y-auto">
              <table className="min-w-full divide-y divide-surface-border relative">
                <thead className="bg-background/50 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th scope="col" className="py-3 pl-4 pr-3 text-left text-sm font-semibold text-foreground">{t.debts_section.headers.beneficiary}</th>
                    <th scope="col" className="px-3 py-3 text-right text-sm font-semibold text-foreground">{t.debts_section.headers.debt}</th>
                    <th scope="col" className="px-3 py-3 text-right text-sm font-semibold text-foreground">{t.debts_section.headers.repayment}</th>
                    <th scope="col" className="px-3 py-3 text-right text-sm font-semibold text-foreground">{t.debts_section.headers.balance}</th>
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
                          {m.totalDette.toLocaleString(dateLocale)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm font-semibold text-success text-right">
                          {m.remboursement.toLocaleString(dateLocale)}
                        </td>
                        <td className={`whitespace-nowrap px-3 py-4 text-sm font-bold text-right ${m.solde > 0 ? 'text-danger' : m.solde < 0 ? 'text-info' : 'text-success'}`}>
                          {m.solde === 0 ? t.debts_section.settled : m.solde.toLocaleString(dateLocale)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="whitespace-nowrap py-8 text-center text-sm text-foreground-muted">
                        {t.debts_section.empty}
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
            <h3 className="text-lg font-semibold leading-6 text-foreground">{t.deliveries_section.title}</h3>
            <p className="mt-1 text-sm text-foreground-muted">{t.deliveries_section.desc}</p>
          </div>
          <PrintSectionButton sectionId="section-livraisons" label={t.print} />
        </div>
        <div className="overflow-hidden shadow-sm ring-1 ring-surface-border sm:rounded-lg bg-surface">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-surface-border text-sm">
              <thead className="bg-background/50">
                <tr>
                  <th scope="col" rowSpan={2} className="py-3 pl-4 pr-3 text-left font-semibold text-foreground border-r border-surface-border align-bottom">
                    {t.deliveries_section.beneficiary}
                  </th>
                  {intrantsList.map(i => (
                    <th key={i.id} scope="col" colSpan={2} className="px-3 py-2 text-center font-semibold text-foreground border-r border-surface-border bg-primary/5">
                      {i.nom} <br/>
                      <span className="text-xs font-normal text-foreground-muted">{i.prix_facturation.toLocaleString(dateLocale)} FCFA/u</span>
                    </th>
                  ))}
                  <th scope="col" rowSpan={2} className="px-3 py-3 text-right font-bold text-foreground align-bottom bg-background/80">
                    {t.deliveries_section.total_global}
                  </th>
                </tr>
                <tr>
                  {intrantsList.map(i => (
                    <Fragment key={i.id}>
                      <th scope="col" className="px-2 py-2 text-right font-medium text-foreground-muted border-t border-surface-border">{t.deliveries_section.quantity}</th>
                      <th scope="col" className="px-2 py-2 text-right font-medium text-foreground-muted border-t border-r border-surface-border">{t.deliveries_section.amount}</th>
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
                              {cell?.quantite ? cell.quantite.toLocaleString(dateLocale) : '-'}
                            </td>
                            <td className="whitespace-nowrap px-2 py-3 text-right text-foreground border-r border-surface-border">
                              {cell?.montant ? cell.montant.toLocaleString(dateLocale) : '-'}
                            </td>
                          </Fragment>
                        )
                      })}
                      <td className="whitespace-nowrap px-3 py-3 text-right font-bold text-danger bg-background/30">
                        {row.totalDette.toLocaleString(dateLocale)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={intrantsList.length * 2 + 2} className="whitespace-nowrap py-8 text-center text-foreground-muted">
                      {t.deliveries_section.empty}
                    </td>
                  </tr>
                )}
                
                {/* Total Row */}
                {memberList.length > 0 && (
                  <tr className="bg-background/80 font-bold border-t-2 border-surface-border">
                    <td className="whitespace-nowrap py-3 pl-4 pr-3 text-right text-foreground border-r border-surface-border">
                      {t.deliveries_section.grand_total}
                    </td>
                    {intrantsList.map(i => {
                      const totalQte = memberList.reduce((sum, row) => sum + (row.intrants[i.id]?.quantite || 0), 0)
                      const totalMnt = memberList.reduce((sum, row) => sum + (row.intrants[i.id]?.montant || 0), 0)
                      return (
                        <Fragment key={i.id}>
                          <td className="whitespace-nowrap px-2 py-3 text-right text-foreground">
                            {totalQte.toLocaleString(dateLocale)}
                          </td>
                          <td className="whitespace-nowrap px-2 py-3 text-right text-foreground border-r border-surface-border text-success">
                            {totalMnt.toLocaleString(dateLocale)}
                          </td>
                        </Fragment>
                      )
                    })}
                    <td className="whitespace-nowrap px-3 py-3 text-right text-primary font-bold">
                      {memberList.reduce((sum, row) => sum + row.totalDette, 0).toLocaleString(dateLocale)}
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
