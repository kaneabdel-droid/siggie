import { login } from './actions'

export default function LoginPage({ searchParams }: { searchParams: { message?: string } }) {
  const message = searchParams?.message

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8 bg-background">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-primary">
          Connexion à SIGGIE
        </h2>
        <p className="mt-2 text-center text-sm text-foreground-muted">
          Système Intégré de Gestion des GIE Agricoles
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

        <form className="space-y-6" action={login}>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium leading-6 text-foreground"
            >
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
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-sm font-medium leading-6 text-foreground"
              >
                Mot de passe
              </label>
              <div className="text-sm">
                <a href="/forgot-password" className="font-semibold text-primary hover:text-primary-hover">
                  Mot de passe oublié ?
                </a>
              </div>
            </div>
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

        <p className="mt-10 text-center text-sm text-foreground-muted">
          Votre GIE n'a pas encore de compte ?{' '}
          <a href="/signup" className="font-semibold leading-6 text-primary hover:text-primary-hover">
            Inscrivez votre GIE
          </a>
        </p>
      </div>
    </div>
  )
}
