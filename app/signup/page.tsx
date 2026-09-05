'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { signup } from './actions'

export default function SignupPage({ searchParams }: { searchParams: { message: string, plan?: string } }) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8 bg-background">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-primary">
          Créer un compte SIGGIE
        </h2>
        <p className="mt-2 text-center text-sm text-foreground-muted">
          Inscrivez votre GIE pour commencer à gérer vos campagnes.
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form className="space-y-6" action={signup}>
          <input type="hidden" name="plan" value={searchParams?.plan || 'standard'} />
          
          {searchParams?.message && (
            <p className="text-sm text-center bg-danger/10 text-danger p-3 rounded-md">
              {searchParams.message}
            </p>
          )}

          <div>
            <label htmlFor="gie_nom" className="block text-sm font-medium leading-6 text-foreground">
              Nom du GIE
            </label>
            <div className="mt-2">
              <input
                id="gie_nom"
                name="gie_nom"
                type="text"
                required
                className="block w-full rounded-md border-0 py-1.5 px-3 bg-surface text-foreground shadow-sm ring-1 ring-inset ring-foreground-muted focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
              />
            </div>
          </div>

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
            <div className="mt-2 relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                className="block w-full rounded-md border-0 py-1.5 px-3 pr-10 bg-surface text-foreground shadow-sm ring-1 ring-inset ring-foreground-muted focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-foreground-muted hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="flex w-full justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              S'inscrire
            </button>
          </div>
        </form>

        <p className="mt-10 text-center text-sm text-foreground-muted">
          Vous avez déjà un compte ?{' '}
          <a href="/login" className="font-semibold leading-6 text-primary hover:text-primary-hover">
            Connectez-vous
          </a>
        </p>
      </div>
    </div>
  )
}
