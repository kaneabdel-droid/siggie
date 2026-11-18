import LanguageSelector from '@/components/LanguageSelector'
import ClientLoginForm from './ClientLoginForm'
import { getDictionary, getLocale } from '@/dictionaries'
import { pageSuivante } from '@/lib/suite'
import { Sparkles, ArrowRight } from 'lucide-react'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ message?: string, next?: string }> }) {
  const params = await searchParams
  const message = params?.message
  // Page à ouvrir après connexion (paiement du forfait choisi avant l'inscription).
  const next = pageSuivante(params?.next) ?? undefined
  const locale = await getLocale()
  const dict = await getDictionary(locale)

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8 bg-background relative">
      <div className="absolute top-4 right-4">
        <LanguageSelector currentLang={locale} />
      </div>
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-primary">
          {dict.auth.login.title}
        </h2>
        <p className="mt-2 text-center text-sm text-foreground-muted">
          {dict.auth.login.desc}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-sm">
        {message && (
          <div className={`mb-6 p-4 rounded-md text-sm font-medium text-center ${message.includes('succès') || message.includes('Vérifiez')
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'bg-danger/10 text-danger border border-danger/20'
            }`}>
            {message}
          </div>
        )}

        <ClientLoginForm dict={dict} next={next} />

        <div className="mt-8 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-5 text-center transition-all hover:border-primary/50 hover:bg-primary/[0.08]">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Nouveau GIE ou coopérative ?
          </div>
          <h3 className="font-heading font-bold text-foreground text-base">
            Créez votre structure en 2 minutes
          </h3>
          <p className="text-xs text-foreground-muted mt-1">
            7 jours d&apos;essai gratuit • Sans engagement • Prise en main immédiate
          </p>
          <a
            href={next ? `/signup?next=${encodeURIComponent(next)}` : '/signup'}
            className="mt-3.5 inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-primary text-white text-sm font-bold shadow-sm hover:bg-primary-hover hover:shadow transition-all group"
          >
            <span>Créer un compte coopérative / GIE</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </div>
    </div>
  )
}
