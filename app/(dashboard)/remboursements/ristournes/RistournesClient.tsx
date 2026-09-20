'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { formatMontant } from '@/lib/currency'
import { addRistourne, deleteRistourne, type RistourneLigne, type SurplusMembre } from './actions'

type Props = {
  surplus: SurplusMembre[]
  historique: RistourneLigne[]
  comptes: { id: string; nom: string }[]
  devise: string
  canCreate: boolean
  canDelete: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dict: any
}

const th = 'px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted'
const inputCls = 'mt-1 block w-full rounded-md bg-background border border-surface-border text-foreground px-3 py-2 text-sm'

export default function RistournesClient({ surplus, historique, comptes, devise, canCreate, canDelete, dict }: Props) {
  const t = dict.ristournes
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  const [membreId, setMembreId] = useState('')
  const [montant, setMontant] = useState('')
  const [compteId, setCompteId] = useState(comptes[0]?.id ?? '')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [motif, setMotif] = useState('')

  const fmt = (v: number) => formatMontant(v, devise)

  const choisir = (s: SurplusMembre) => {
    setMembreId(s.membre_id)
    setMontant(String(Math.round(s.surplus * 100) / 100))
    setMessage(null)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    startTransition(async () => {
      const result = await addRistourne({
        membre_id: membreId,
        montant: Number(montant.replace(/\s/g, '').replace(',', '.')),
        compte_id: compteId,
        date_ristourne: date,
        motif,
      })
      if (result && 'error' in result && result.error) {
        setMessage(result.error)
      } else {
        setMembreId('')
        setMontant('')
        setMotif('')
        router.refresh()
      }
    })
  }

  const supprimer = (r: RistourneLigne) => {
    if (!confirm(t.confirm_delete)) return
    setMessage(null)
    startTransition(async () => {
      const result = await deleteRistourne(r.id)
      if (result && 'error' in result && result.error) setMessage(result.error)
      else router.refresh()
    })
  }

  return (
    <div className="space-y-8">
      {message && <p className="rounded-md bg-danger/10 p-3 text-sm text-danger">{message}</p>}

      <section>
        <h4 className="mb-2 text-sm font-semibold text-foreground">{t.surplus_title}</h4>
        <p className="mb-3 text-xs text-foreground-muted">{t.surplus_desc}</p>
        <div className="overflow-x-auto rounded-lg border border-surface-border bg-surface">
          <table className="min-w-full divide-y divide-surface-border text-sm">
            <thead>
              <tr>
                <th className={`${th} text-left`}>{t.cols.membre}</th>
                <th className={`${th} text-right`}>{t.cols.facture}</th>
                <th className={`${th} text-right`}>{t.cols.rembourse}</th>
                <th className={`${th} text-right`}>{t.cols.ristournes}</th>
                <th className={`${th} text-right`}>{t.cols.surplus}</th>
                {canCreate && <th />}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {surplus.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-foreground-muted">{t.no_surplus}</td></tr>
              )}
              {surplus.map((s) => (
                <tr key={s.membre_id}>
                  <td className="px-3 py-2 text-foreground">{s.nom}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(s.facture)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(s.rembourse)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(s.ristournes)}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-warning">{fmt(s.surplus)}</td>
                  {canCreate && (
                    <td className="px-3 py-2 text-right">
                      <button type="button" onClick={() => choisir(s)} className="text-xs font-medium text-primary hover:underline">
                        {t.give_back}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {canCreate && (
        <section className="rounded-lg border border-surface-border bg-surface p-4">
          <h4 className="mb-3 text-sm font-semibold text-foreground">{t.form_title}</h4>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-foreground">{t.cols.membre}</label>
              <select required value={membreId} onChange={(e) => setMembreId(e.target.value)} disabled={isPending} className={inputCls}>
                <option value="">{t.select_member}</option>
                {surplus.map((s) => (
                  <option key={s.membre_id} value={s.membre_id}>{s.nom} - {fmt(s.surplus)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">{t.amount}</label>
              <input required inputMode="decimal" value={montant} onChange={(e) => setMontant(e.target.value)} disabled={isPending} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">{t.account}</label>
              <select required value={compteId} onChange={(e) => setCompteId(e.target.value)} disabled={isPending} className={inputCls}>
                {comptes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">{t.date}</label>
              <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={isPending} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-foreground">{t.motif}</label>
              <input value={motif} onChange={(e) => setMotif(e.target.value)} disabled={isPending} className={inputCls} />
            </div>
            <div className="sm:col-span-2 flex items-center justify-between gap-3">
              <p className="text-xs text-foreground-muted">{t.form_hint}</p>
              <button type="submit" disabled={isPending || comptes.length === 0} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50">
                {isPending ? t.saving : t.submit}
              </button>
            </div>
          </form>
        </section>
      )}

      <section>
        <h4 className="mb-2 text-sm font-semibold text-foreground">{t.history_title}</h4>
        <div className="overflow-x-auto rounded-lg border border-surface-border bg-surface">
          <table className="min-w-full divide-y divide-surface-border text-sm">
            <thead>
              <tr>
                <th className={`${th} text-left`}>{t.date}</th>
                <th className={`${th} text-left`}>{t.cols.membre}</th>
                <th className={`${th} text-right`}>{t.amount}</th>
                <th className={`${th} text-left`}>{t.account}</th>
                <th className={`${th} text-left`}>{t.motif}</th>
                {canDelete && <th />}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {historique.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-foreground-muted">{t.no_history}</td></tr>
              )}
              {historique.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(r.date_ristourne).toLocaleDateString('fr-FR')}</td>
                  <td className="px-3 py-2 text-foreground">{r.membre}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(r.montant)}</td>
                  <td className="px-3 py-2">{r.compte}</td>
                  <td className="px-3 py-2 text-foreground-muted">{r.motif || '-'}</td>
                  {canDelete && (
                    <td className="px-3 py-2 text-right">
                      <button type="button" onClick={() => supprimer(r)} disabled={isPending} aria-label={t.delete} className="text-danger hover:opacity-80 disabled:opacity-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-foreground-muted">{t.nature_hint}</p>
      </section>
    </div>
  )
}
