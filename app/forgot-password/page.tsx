import { resetPasswordForEmail } from './actions'

export default function ForgotPasswordPage({ searchParams }: { searchParams: { message: string } }) {
  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8 bg-background">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-primary">
          Mot de passe oublié
        </h2>
        <p className="mt-2 text-center text-sm text-foreground-muted">
          Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form className="space-y-6" action={resetPasswordForEmail}>
          {searchParams?.message && (
            <p className="text-sm text-center bg-secondary/10 text-secondary p-3 rounded-md">
              {searchParams.message}
            </p>
          )}

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
            <button
              type="submit"
              className="flex w-full justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Envoyer le lien
            </button>
          </div>
        </form>

        <p className="mt-10 text-center text-sm text-foreground-muted">
          <a href="/login" className="font-semibold leading-6 text-primary hover:text-primary-hover">
            Retour à la connexion
          </a>
        </p>
      </div>
    </div>
  )
}
