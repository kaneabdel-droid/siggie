import LanguageSelector from '@/components/LanguageSelector'
import ClientSignupForm from './ClientSignupForm'
import { getDictionary, getLocale } from '@/dictionaries'

export default async function SignupPage({ searchParams }: { searchParams: { message: string, plan?: string } }) {
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const plan = searchParams?.plan || 'standard'

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
        {searchParams?.message && (
          <p className="text-sm text-center bg-danger/10 text-danger p-3 rounded-md mb-6">
            {searchParams.message}
          </p>
        )}

        <ClientSignupForm dict={dict} plan={plan} />

        <p className="mt-10 text-center text-sm text-foreground-muted">
          {dict.auth.signup.has_account}{' '}
          <a href="/login" className="font-semibold leading-6 text-primary hover:text-primary-hover">
            {dict.auth.signup.login}
          </a>
        </p>
      </div>
    </div>
  )
}
