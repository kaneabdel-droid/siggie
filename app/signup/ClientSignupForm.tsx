'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { signup } from '@/app/signup/actions'

export default function ClientSignupForm({ dict, plan }: { dict: any, plan: string }) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <form className="space-y-6" action={signup}>
      <input type="hidden" name="plan" value={plan} />

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
