import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Map as MapIcon, Users } from 'lucide-react'
import QuantitePrevueInput from './QuantitePrevueInput'
import { repartirAuProrata } from '@/lib/intrants/repartition'
import { isStockableType, isSuperficieBasedType } from '@/lib/intrants/types'
import { getDictionary, getLocale } from '@/dictionaries'

export const dynamic = 'force-dynamic'

type InscritRow = {
  membre_id: string
  superficie: number | null
  membres: { prenom: string; nom: string; code_membre: string | null } | null
}
type CampagneIntrantRow = {
  intrant_id: string
  quantite_prevue?: number | null
  intrants: { nom: string; type_intrant: string; quantite_stock: number | null } | null
}

export default async function CampagneRepartitionPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const t = dict.campagnes_detail.repartition
  const nf = new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'fr-FR', { maximumFractionDigits: 2 })
  const fmt = (n: number) => nf.format(n)

  const [{ data: campagne }, { data: inscrits }, { data: campagneIntrants }, { data: distributions }] = await Promise.all([
    supabase.from('campagnes').select('id, nom').eq('id', id).single(),
    supabase.from('campagne_membres').select('membre_id, superficie, membres(prenom, nom, code_membre)').eq('campagne_id', id),
    // `*` plutôt qu'une liste de colonnes : la page reste lisible même si la
    // migration 37 (quantite_prevue) n'est pas encore appliquée.
    supabase.from('campagne_intrants').select('*, intrants(nom, type_intrant, quantite_stock)').eq('campagne_id', id),
    supabase.from('distribution_intrants').select('membre_id, intrant_id, quantite').eq('campagne_id', id),
  ])

  if (!campagne) notFound()

  const membres = ((inscrits || []) as unknown as InscritRow[])
    .map((cm) => ({
      membre_id: cm.membre_id,
      superficie: Number(cm.superficie) || 0,
      nom: cm.membres ? `${cm.membres.prenom} ${cm.membres.nom}` : '-',
      code: cm.membres?.code_membre || '',
    }))
    .sort((a, b) => a.nom.localeCompare(b.nom))
  const totalSuperficie = membres.reduce((sum, m) => sum + m.superficie, 0)

  // Façon culturale / Service Hydraulique sont facturés à l'hectare : leur
  // quantité par défaut est déjà la superficie du membre, pas une part au prorata.
  const intrants = ((campagneIntrants || []) as unknown as CampagneIntrantRow[])
    .filter((ci) => ci.intrants && !isSuperficieBasedType(ci.intrants.type_intrant))
    .map((ci) => ({
      intrant_id: ci.intrant_id,
      nom: ci.intrants!.nom,
      type: ci.intrants!.type_intrant,
      stock: isStockableType(ci.intrants!.type_intrant) ? Number(ci.intrants!.quantite_stock) || 0 : null,
      quantitePrevue: Number(ci.quantite_prevue) || 0,
    }))
    .sort((a, b) => a.nom.localeCompare(b.nom))

  const parts = new Map(intrants.map((i) => [i.intrant_id, repartirAuProrata(i.quantitePrevue, membres)]))
  const dejaDistribue = new Map<string, number>()
  for (const d of distributions || []) {
    const key = `${d.membre_id}|${d.intrant_id}`
    dejaDistribue.set(key, (dejaDistribue.get(key) || 0) + (Number(d.quantite) || 0))
  }

  const th = 'px-3 py-3.5 text-sm font-semibold text-foreground'
  const td = 'whitespace-nowrap px-3 py-4 text-sm'

  return (
    <div>
      <div className="mb-6">
        <Link href="/campagnes" className="text-sm font-medium text-primary hover:text-primary-hover flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          {dict.campagnes_detail.back}
        </Link>
      </div>

      <div className="min-w-0">
        <h2 className="text-2xl font-bold font-heading text-foreground break-words">
          {t.title} {campagne.nom}
        </h2>
        <p className="mt-2 text-sm text-foreground-muted">{t.desc}</p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="overflow-hidden rounded-lg bg-surface px-4 py-5 shadow sm:p-6 border border-surface-border flex items-center gap-4">
          <div className="rounded-md bg-secondary/20 p-3 shrink-0">
            <Users className="h-6 w-6 text-secondary" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <dt className="truncate text-sm font-medium text-foreground-muted">{t.enrolled_members}</dt>
            <dd className="mt-1 text-2xl font-semibold tracking-tight text-foreground truncate">{membres.length}</dd>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg bg-surface px-4 py-5 shadow sm:p-6 border border-surface-border flex items-center gap-4">
          <div className="rounded-md bg-success/20 p-3 shrink-0">
            <MapIcon className="h-6 w-6 text-success" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <dt className="truncate text-sm font-medium text-foreground-muted">{t.total_area}</dt>
            <dd className="mt-1 text-2xl font-semibold tracking-tight text-foreground truncate">{fmt(totalSuperficie)} ha</dd>
          </div>
        </div>
      </div>

      {membres.length === 0 || totalSuperficie <= 0 ? (
        <div className="mt-8 text-sm text-warning p-4 bg-warning/10 rounded-md">
          {membres.length === 0 ? t.no_members : t.no_area}{' '}
          <Link href={`/campagnes/${id}/config`} className="underline font-semibold">{t.config_link}</Link>
        </div>
      ) : intrants.length === 0 ? (
        <div className="mt-8 text-sm text-warning p-4 bg-warning/10 rounded-md">
          {t.no_intrants}{' '}
          <Link href={`/campagnes/${id}/config`} className="underline font-semibold">{t.config_link}</Link>
        </div>
      ) : (
        <>
          {/* 1. Quantité totale à répartir par intrant */}
          <div className="mt-8">
            <h3 className="text-base font-semibold leading-6 text-foreground">{t.quantities_title}</h3>
            <p className="mt-1 text-sm text-foreground-muted">{t.quantities_desc}</p>
            <div className="mt-4 overflow-x-auto shadow ring-1 ring-surface-border sm:rounded-lg bg-surface">
              <table className="min-w-full divide-y divide-surface-border">
                <thead className="bg-background/50">
                  <tr>
                    <th scope="col" className={`${th} text-left pl-4 sm:pl-6`}>{t.headers.intrant}</th>
                    <th scope="col" className={`${th} text-right`}>{t.headers.stock}</th>
                    <th scope="col" className={`${th} text-right`}>{t.headers.quantity_to_split}</th>
                    <th scope="col" className={`${th} text-right pr-4 sm:pr-6`}>{t.headers.dose_per_ha}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border bg-surface">
                  {intrants.map((i) => (
                    <tr key={i.intrant_id} className="hover:bg-background/50 transition-colors">
                      <td className={`${td} pl-4 sm:pl-6 font-medium text-foreground`}>
                        {i.nom}
                        <span className="ml-2 inline-flex items-center capitalize rounded-md px-2 py-1 text-xs font-medium bg-surface-border text-foreground">{i.type}</span>
                      </td>
                      <td className={`${td} text-right text-foreground-muted`}>{i.stock === null ? '—' : fmt(i.stock)}</td>
                      <td className={`${td} text-right`}>
                        <QuantitePrevueInput
                          campagneId={id}
                          intrantId={i.intrant_id}
                          initialValue={i.quantitePrevue}
                          stock={i.stock}
                          useStockLabel={t.use_stock}
                        />
                      </td>
                      <td className={`${td} text-right pr-4 sm:pr-6 text-foreground-muted`}>{fmt(i.quantitePrevue / totalSuperficie)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Part de chaque membre */}
          <div className="mt-8">
            <h3 className="text-base font-semibold leading-6 text-foreground">{t.shares_title}</h3>
            <p className="mt-1 text-sm text-foreground-muted">{t.shares_desc}</p>
            <div className="mt-4 overflow-x-auto shadow ring-1 ring-surface-border sm:rounded-lg bg-surface">
              <table className="min-w-full divide-y divide-surface-border">
                <thead className="bg-background/50">
                  <tr>
                    <th scope="col" className={`${th} text-left pl-4 sm:pl-6`}>{t.headers.member}</th>
                    <th scope="col" className={`${th} text-right`}>{t.headers.area}</th>
                    <th scope="col" className={`${th} text-right`}>{t.headers.percent}</th>
                    {intrants.map((i) => (
                      <th key={i.intrant_id} scope="col" className={`${th} text-right`}>{i.nom}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border bg-surface">
                  {membres.map((m) => (
                    <tr key={m.membre_id} className="hover:bg-background/50 transition-colors">
                      <td className={`${td} pl-4 sm:pl-6 font-medium text-foreground`}>
                        {m.nom}
                        {m.code && <span className="ml-2 text-xs text-foreground-muted font-normal">({m.code})</span>}
                      </td>
                      <td className={`${td} text-right text-foreground-muted`}>{fmt(m.superficie)}</td>
                      <td className={`${td} text-right text-foreground-muted`}>{fmt((m.superficie / totalSuperficie) * 100)} %</td>
                      {intrants.map((i) => {
                        const part = parts.get(i.intrant_id)?.[m.membre_id] || 0
                        const deja = dejaDistribue.get(`${m.membre_id}|${i.intrant_id}`) || 0
                        return (
                          <td key={i.intrant_id} className={`${td} text-right`}>
                            <div className="font-semibold text-primary">{fmt(part)}</div>
                            {deja > 0 && (
                              <div className={`text-xs ${deja > part ? 'text-danger' : 'text-foreground-muted'}`}>
                                {t.already_distributed} {fmt(deja)}
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-background/50">
                  <tr>
                    <td className={`${td} pl-4 sm:pl-6 font-semibold text-foreground`}>{t.total}</td>
                    <td className={`${td} text-right font-semibold text-foreground`}>{fmt(totalSuperficie)}</td>
                    <td className={`${td} text-right font-semibold text-foreground`}>100 %</td>
                    {intrants.map((i) => (
                      <td key={i.intrant_id} className={`${td} text-right font-semibold text-foreground`}>{fmt(i.quantitePrevue)}</td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
