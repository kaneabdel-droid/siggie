import LanguageSelector from '@/components/LanguageSelector'
import ClientSignupForm from './ClientSignupForm'
import { getDictionary, getLocale } from '@/dictionaries'
import { pageSuivante } from '@/lib/suite'

// Next 16 : searchParams est une promesse. Lu sans `await`, le forfait choisi était perdu
// (toujours « standard ») et le message d'erreur d'inscription ne s'affichait jamais.
export default async function SignupPage({ searchParams }: { searchParams: Promise<{ message?: string, plan?: string, next?: string }> }) {
  const params = await searchParams
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  // Sans forfait dans l'adresse, inscription simple (essai gratuit) : pas de page de paiement à la suite.
  const plan = params?.plan ?? ''
  const next = pageSuivante(params?.next) ?? ''

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8 bg-background relative">
      <div className="absolute top-4 right-4">
        <LanguageSelector currentLang={locale} />
      </div>
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-primary">
          {dict.auth.signup.title}
        </h2>
        <p className="mt-2 text-center text-sm text-foreground-muted">
          {dict.auth.signup.desc}
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        {params?.message && (
          <p className="text-sm text-center bg-danger/10 text-danger p-3 rounded-md mb-6">
            {params.message}
          </p>
        )}

        <ClientSignupForm dict={dict} plan={plan} next={next} />

        <p className="mt-10 text-center text-sm text-foreground-muted">
          {dict.auth.signup.has_account}{' '}
          <a href={next ? `/login?next=${encodeURIComponent(next)}` : plan ? `/login?next=${encodeURIComponent(`/checkout?plan=${plan}`)}` : '/login'} className="font-semibold leading-6 text-primary hover:text-primary-hover">
            {dict.auth.signup.login}
          </a>
        </p>
      </div>
    </div>
  )
}
