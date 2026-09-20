import { redirect } from 'next/navigation'
import { getTenantContext } from '@/utils/supabase/tenant'
import ClientLayout from './ClientLayout'
import { getDictionary, getLocale } from '@/dictionaries'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const locale = await getLocale()
  const dict = await getDictionary(locale)

  return (
    <ClientLayout
      subscriptionTier={tenant.subscriptionTier}
      role={tenant.role}
      permissions={tenant.permissions}
      gieName={tenant.gieName}
      dict={dict}
      locale={locale}
    >
      {children}
    </ClientLayout>
  )
}
