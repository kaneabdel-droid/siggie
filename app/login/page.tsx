import LanguageSelector from '@/components/LanguageSelector'
import ClientLoginForm from './ClientLoginForm'
import { getDictionary, getLocale } from '@/dictionaries'

export default async function LoginPage({ searchParams }: { searchParams: { message?: string } }) {
  const message = searchParams?.message
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
          <div className={`mb-6 p-4 rounded-md text-sm font-medium text-center ${
            message.includes('succès') || message.includes('Vérifiez')
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'bg-danger/10 text-danger border border-danger/20'
          }`}>
            {message}
          </div>
        )}

        <ClientLoginForm dict={dict} />

        <p className="mt-10 text-center text-sm text-foreground-muted">
          {dict.auth.login.no_account}{' '}
          <a href="/signup" className="font-semibold leading-6 text-primary hover:text-primary-hover">
            {dict.auth.login.signup}
          </a>
        </p>
      </div>
    </div>
  )
}
