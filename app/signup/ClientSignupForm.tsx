'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { signup } from '@/app/signup/actions'
import { AUTRE_PAYS, PAYS, PAYS_PAR_DEFAUT } from '@/lib/pays'

/** Pays triés selon leur nom dans la langue de l'interface (noms français si le navigateur ne sait pas traduire). */
function paysTries(locale: string) {
  let noms: Intl.DisplayNames | null = null
  try {
    noms = new Intl.DisplayNames([locale], { type: 'region' })
  } catch {}
  return PAYS.map((p) => ({ code: p.code, nom: noms?.of(p.code) ?? p.nom })).sort((a, b) => a.nom.localeCompare(b.nom, locale))
}

export default function ClientSignupForm({ dict, plan, next, locale }: { dict: any, plan: string, next?: string, locale: string }) {
  const [showPassword, setShowPassword] = useState(false)
  const [pays, setPays] = useState(PAYS_PAR_DEFAUT)
  const champ = 'block w-full rounded-md border-0 py-1.5 px-3 bg-surface text-foreground shadow-sm ring-1 ring-inset ring-foreground-muted focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6'

  return (
    <form className="space-y-6" action={signup}>
      <input type="hidden" name="plan" value={plan} />
      {next && <input type="hidden" name="next" value={next} />}

      <div>
        <label htmlFor="gie_nom" className="block text-sm font-medium leading-6 text-foreground">
          {dict.auth.signup.gie_name}
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
        <label htmlFor="pays" className="block text-sm font-medium leading-6 text-foreground">
          {dict.auth.signup.country}
        </label>
        <div className="mt-2">
          <select id="pays" name="pays" value={pays} onChange={(e) => setPays(e.target.value)} className={champ}>
            {paysTries(locale).map((p) => (
              <option key={p.code} value={p.code}>{p.nom}</option>
            ))}
            <option value={AUTRE_PAYS}>{dict.auth.signup.other_country}</option>
          </select>
        </div>
      </div>

      {pays === AUTRE_PAYS && (
        <div>
          <label htmlFor="pays_nom" className="block text-sm font-medium leading-6 text-foreground">
            {dict.auth.signup.other_country_name}
          </label>
          <div className="mt-2">
            <input id="pays_nom" name="pays_nom" type="text" required className={champ} />
          </div>
          <p className="mt-1 text-xs text-foreground-muted">{dict.auth.signup.usd_note}</p>
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium leading-6 text-foreground">
          {dict.auth.signup.email}
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
          {dict.auth.signup.password}
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
          {dict.auth.signup.btn}
        </button>
      </div>
    </form>
  )
}
