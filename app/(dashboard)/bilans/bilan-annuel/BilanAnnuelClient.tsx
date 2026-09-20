'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatMontant } from '@/lib/currency'
import type { BilanCalcule, Ligne, RubriqueSaisie } from '@/lib/bilan-annuel'
import PrintSectionButton from '@/components/PrintSectionButton'
import BilanAnnuelPdfButton, { type GieEntete } from './BilanAnnuelPdfButton'
import { saveBilanSaisie } from './actions'

type Props = {
  annee: number
  annees: number[]
  n: BilanCalcule
  n1: BilanCalcule
  devise: string
  canEdit: boolean
  gie: GieEntete
  locale: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dict: any
}

const thBase = 'px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted'
const tdNum = 'px-3 py-2 text-right tabular-nums whitespace-nowrap'
const tdNote = 'px-3 py-2 text-xs text-foreground-muted'

export default function BilanAnnuelClient({ annee, annees, n, n1, devise, canEdit, gie, locale, dict }: Props) {
  const t = dict.bilan_annuel
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  const fmt = (v: number) => formatMontant(v, devise)

  const save = (rubrique: RubriqueSaisie, raw: string) => {
    const montant = raw.trim() === '' ? 0 : Number(raw.replace(/\s/g, '').replace(',', '.'))
    setMessage(null)
    startTransition(async () => {
      const result = await saveBilanSaisie(annee, rubrique, montant)
      if (result && 'error' in result && result.error) setMessage(result.error)
      else router.refresh()
    })
  }

  // Cellule de montant modifiable pour les rubriques "à saisir".
  const saisie = (rubrique: RubriqueSaisie, value: number) =>
    canEdit ? (
      <input
        key={`${rubrique}-${value}`}
        type="text"
        inputMode="decimal"
        defaultValue={value ? String(value) : ''}
        placeholder="0"
        disabled={isPending}
        aria-label={t.rows[rubrique]}
        onBlur={(e) => {
          if (Number(e.target.value.replace(/\s/g, '').replace(',', '.') || 0) !== value) save(rubrique, e.target.value)
        }}
        className="w-32 rounded-md border border-surface-border bg-background px-2 py-1 text-right text-sm text-foreground"
      />
    ) : (
      <>{fmt(value)}</>
    )

  const actifRows = [
    { key: 'immobilisations', note: t.notes.immobilisations },
    { key: 'stocks', note: t.notes.stocks },
    { key: 'creances', note: t.notes.creances },
    { key: 'disponibilites', note: t.notes.disponibilites },
  ] as const
  const passifRows = [
    { key: 'capital', note: t.notes.capital },
    { key: 'resultat', note: t.notes.resultat_passif },
    { key: 'subventions', note: t.notes.a_saisir, saisie: 'subventions' as const },
    { key: 'emprunts', note: t.notes.a_saisir, saisie: 'emprunts' as const },
    { key: 'dettes', note: t.notes.dettes },
    { key: 'credits_tresorerie', note: t.notes.credits_tresorerie },
  ] as const

  const crProduits = [
    { key: 'ventes', note: t.notes.ventes },
    { key: 'gain_remboursement', note: t.notes.gain_remboursement },
    { key: 'prestations', note: t.notes.prestations },
    { key: 'autres_produits', note: t.notes.a_saisir, saisie: 'autres_produits' as const },
  ] as const
  const crCharges = [
    { key: 'achats', note: t.notes.achats },
    { key: 'variation_stock', note: t.notes.variation_stock },
    { key: 'perte_remboursement', note: t.notes.perte_remboursement },
    { key: 'charges_materiel', note: t.notes.charges_materiel },
    { key: 'interets', note: t.notes.interets },
    { key: 'autres_charges', note: t.notes.a_saisir, saisie: 'autres_charges' as const },
  ] as const

  const bilanTable = (title: string, rows: readonly { key: string; note: string; saisie?: RubriqueSaisie }[], side: 'actif' | 'passif') => {
    const cur = n[side] as unknown as Record<string, Ligne>
    const prev = n1[side] as unknown as Record<string, Ligne>
    return (
      <section>
        <h3 className="mb-2 text-lg font-semibold text-foreground font-heading">{title}</h3>
        <div className="overflow-x-auto rounded-lg border border-surface-border bg-surface">
          <table className="min-w-full divide-y divide-surface-border text-sm">
            <thead>
              <tr>
                <th className={`${thBase} text-left`}>{t.cols.rubrique}</th>
                <th className={`${thBase} text-right`}>{t.cols.brut}</th>
                <th className={`${thBase} text-right`}>{t.cols.amo}</th>
                <th className={`${thBase} text-right`}>{t.cols.net}</th>
                <th className={`${thBase} text-right`}>{t.cols.net_n1}</th>
                <th className={`${thBase} text-left`}>{t.cols.calculs}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {rows.map((r) => (
                <tr key={r.key}>
                  <td className="px-3 py-2 text-foreground">{t.rows[r.key]}</td>
                  <td className={tdNum}>{r.saisie ? saisie(r.saisie, cur[r.key].brut) : fmt(cur[r.key].brut)}</td>
                  <td className={tdNum}>{fmt(cur[r.key].amo)}</td>
                  <td className={`${tdNum} font-medium text-foreground`}>{fmt(cur[r.key].net)}</td>
                  <td className={`${tdNum} text-foreground-muted`}>{fmt(prev[r.key].net)}</td>
                  <td className={tdNote}>{r.note}</td>
                </tr>
              ))}
              <tr className="bg-background/60 font-semibold">
                <td className="px-3 py-2 text-foreground">{t.rows[`total_${side}`]}</td>
                <td className={tdNum}>{fmt(cur.total.brut)}</td>
                <td className={tdNum}>{fmt(cur.total.amo)}</td>
                <td className={tdNum}>{fmt(cur.total.net)}</td>
                <td className={`${tdNum} text-foreground-muted`}>{fmt(prev.total.net)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    )
  }

  const cr = n.resultat as unknown as Record<string, number>
  const cr1 = n1.resultat as unknown as Record<string, number>

  const crRows = (rows: readonly { key: string; note: string; saisie?: RubriqueSaisie }[]) =>
    rows.map((r) => (
        <tr key={r.key}>
          <td className="px-3 py-2 text-foreground">{t.rows[r.key]}</td>
          <td className={tdNum}>{r.saisie ? saisie(r.saisie, cr[r.key]) : fmt(cr[r.key])}</td>
          <td className={`${tdNum} text-foreground-muted`}>{fmt(cr1[r.key])}</td>
          <td className={tdNote}>{r.note}</td>
        </tr>
    ))

  const totalRow = (k: string, strong?: boolean) => (
    <tr key={k} className={`bg-background/60 font-semibold ${strong ? (cr[k] >= 0 ? 'text-success' : 'text-danger') : ''}`}>
      <td className="px-3 py-2">{t.rows[k]}</td>
      <td className={tdNum}>{fmt(cr[k])}</td>
      <td className={`${tdNum} font-normal text-foreground-muted`}>{fmt(cr1[k])}</td>
      <td className={`${tdNote} font-normal`}>{strong ? t.notes.resultat : ''}</td>
    </tr>
  )

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="annee" className="text-sm font-medium text-foreground">{t.year}</label>
        <select
          id="annee"
          value={annee}
          onChange={(e) => router.push(`/bilans/bilan-annuel?annee=${e.target.value}`)}
          className="rounded-md border border-surface-border bg-background px-3 py-2 text-sm text-foreground"
        >
          {annees.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        {isPending && <span className="text-xs text-foreground-muted">{t.saving}</span>}
        {message && <span className="text-xs text-danger">{message}</span>}
        <div className="ml-auto flex gap-2">
          <BilanAnnuelPdfButton annee={annee} n={n} n1={n1} devise={devise} gie={gie} locale={locale} t={t} label={t.export_pdf} />
          <PrintSectionButton sectionId="bilan-annuel-print" label={dict.common.print} />
        </div>
      </div>

      <div id="bilan-annuel-print" className="space-y-8">
        {/* En-tête de l'entreprise : visible uniquement à l'impression */}
        <div className="hidden print:block border-b-2 border-primary pb-3">
          {gie.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={gie.logoUrl} alt="" style={{ height: '56px', width: 'auto', marginBottom: '8px' }} />
          )}
          <div className="text-2xl font-bold text-primary">{gie.nom}</div>
          {gie.adresse && <div className="text-sm">{gie.adresse}</div>}
          {(gie.telephone || gie.email) && <div className="text-sm">{[gie.telephone, gie.email].filter(Boolean).join('  |  ')}</div>}
          {gie.identification && <div className="text-sm">{gie.identification}</div>}
          <div className="mt-2 text-base font-semibold">{t.title} - {annee}</div>
        </div>

      {bilanTable(`${t.actif_title} ${annee}`, actifRows, 'actif')}
      {bilanTable(`${t.passif_title} ${annee}`, passifRows, 'passif')}

      <section>
        <h3 className="mb-2 text-lg font-semibold text-foreground font-heading">{`${t.resultat_title} ${annee}`}</h3>
        <div className="overflow-x-auto rounded-lg border border-surface-border bg-surface">
          <table className="min-w-full divide-y divide-surface-border text-sm">
            <thead>
              <tr>
                <th className={`${thBase} text-left`}>{t.cols.rubrique}</th>
                <th className={`${thBase} text-right`}>{t.cols.montant}</th>
                <th className={`${thBase} text-right`}>{t.cols.montant_n1}</th>
                <th className={`${thBase} text-left`}>{t.cols.calculs}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {crRows(crProduits)}
              {totalRow('total_produits')}
              {crRows(crCharges)}
              {totalRow('total_charges')}
              {totalRow('resultat', true)}
            </tbody>
          </table>
        </div>
      </section>
      </div>

      <p className="text-xs text-foreground-muted">
        {t.footnote}
        {!canEdit && ` ${t.read_only}`}
      </p>
    </div>
  )
}
