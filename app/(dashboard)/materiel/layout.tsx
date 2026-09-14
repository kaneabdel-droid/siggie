import { redirect } from 'next/navigation'
import { getTenantContext } from '@/utils/supabase/tenant'
import ClientMaterielLayout from './ClientMaterielLayout'
import { getDictionary, getLocale } from '@/dictionaries'

export default async function MaterielLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  if (tenant.subscriptionTier === 'standard') {
    redirect('/dashboard?error=upgrade_required')
  }

  const locale = await getLocale()
  const dict = await getDictionary(locale)

  return (
    <ClientMaterielLayout dict={dict.materiel}>
      {children}
    </ClientMaterielLayout>
  )
}
