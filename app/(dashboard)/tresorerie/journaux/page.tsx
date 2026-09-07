import { getComptes } from '../actions'
import JournalClient from './JournalClient'
import { getDictionary, getLocale } from '@/dictionaries'

export default async function JournauxPage() {
  const { comptes, error } = await getComptes()
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const t = dict.tresorerie_pages.journaux

  if (error) {
    return <div className="p-4 bg-danger/10 text-danger rounded-md">Erreur: {error}</div>
  }

  if (!comptes || comptes.length === 0) {
    return (
      <div className="text-center py-12 text-foreground-muted bg-surface rounded-lg border border-surface-border">
        {t.no_account}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h3 className="text-base font-semibold leading-6 text-foreground">{t.title}</h3>
        <p className="mt-2 text-sm text-foreground-muted">
          {t.desc}
        </p>
      </div>

      <JournalClient comptes={comptes} dict={dict} locale={locale} />
    </div>
  )
}
