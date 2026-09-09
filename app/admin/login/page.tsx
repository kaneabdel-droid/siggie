import { ShieldCheck } from 'lucide-react'
import { loginAdmin } from './actions'

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const { message } = await searchParams

  return (
    <div className="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 bg-surface">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold leading-9 tracking-tight text-foreground">
          Administration SIGGIE
        </h2>
        <p className="mt-2 text-sm text-foreground-muted">
          Accès réservé à l&apos;équipe Demba Solution
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-sm">
        {message && (
          <div className="mb-6 p-4 rounded-md text-sm font-medium text-center bg-danger/10 text-danger border border-danger/20">
            {message}
          </div>
        )}

        <form className="space-y-6 bg-background p-6 rounded-2xl border border-surface-border shadow-sm" action={loginAdmin}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium leading-6 text-foreground">
              Adresse e-mail
            </label>
            <div className="mt-2">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="block w-full rounded-md border-0 py-1.5 px-3 bg-surface text-foreground shadow-sm ring-1 ring-inset ring-foreground-muted focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium leading-6 text-foreground">
              Mot de passe
            </label>
            <div className="mt-2">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="block w-full rounded-md border-0 py-1.5 px-3 bg-surface text-foreground shadow-sm ring-1 ring-inset ring-foreground-muted focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="flex w-full justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Se connecter
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-foreground-muted">
          Ceci n&apos;est pas l&apos;espace de connexion des GIE.{' '}
          <a href="/login" className="font-semibold text-primary hover:text-primary-hover">
            Connexion client
          </a>
        </p>
      </div>
    </div>
  )
}
