import { updatePassword } from './actions'
import { getDictionary, getLocale } from '@/dictionaries'

export default async function UpdatePasswordPage({ searchParams }: { searchParams: { message: string } }) {
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const d = dict.update_password

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8 bg-background">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-primary">
          {d.title}
        </h2>
        <p className="mt-2 text-center text-sm text-foreground-muted">
          {d.desc}
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form className="space-y-6" action={updatePassword}>
          {searchParams?.message && (
            <p className="text-sm text-center bg-danger/10 text-danger p-3 rounded-md">
              {searchParams.message}
            </p>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium leading-6 text-foreground">
              {d.label}
            </label>
            <div className="mt-2">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
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
              {d.submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
