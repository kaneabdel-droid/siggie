import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LayoutDashboard, User, Users } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { getDictionary, getLocale } from '@/dictionaries'

export default async function BilansLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: userData } = await supabase
    .from('utilisateurs')
    .select('gies(subscription_tier)')
    .eq('id', user.id)
    .single()

  const gie = Array.isArray(userData?.gies) ? userData.gies[0] : userData?.gies
  const tier = gie?.subscription_tier || 'standard'
  if (tier !== 'premium') {
    redirect('/dashboard?error=upgrade_required')
  }

  const locale = await getLocale()
  const dict = await getDictionary(locale)

  return (
    <div className="space-y-6">
      <div className="border-b border-surface-border pb-5">
        <h2 className="text-2xl font-bold leading-7 text-foreground sm:truncate sm:text-3xl sm:tracking-tight font-heading">
          {dict.bilans.title}
        </h2>
        <p className="mt-2 text-sm text-foreground-muted">
          {dict.bilans.desc}
        </p>
      </div>

      <nav className="flex space-x-4 border-b border-surface-border pb-4" aria-label="Tabs">
        <Link
          href="/bilans"
          className="bg-surface text-foreground-muted hover:text-foreground rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2 border border-surface-border"
        >
          <LayoutDashboard className="w-4 h-4" />
          {dict.bilans.tabs.overview}
        </Link>
        <Link
          href="/bilans/releve-membre"
          className="bg-surface text-foreground-muted hover:text-foreground rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2 border border-surface-border"
        >
          <User className="w-4 h-4" />
          {dict.bilans.tabs.releve_membre}
        </Link>
        <Link
          href="/bilans/releve-client"
          className="bg-surface text-foreground-muted hover:text-foreground rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2 border border-surface-border"
        >
          <Users className="w-4 h-4" />
          {dict.bilans.tabs.releve_client}
        </Link>
      </nav>

      {children}
    </div>
  )
}
