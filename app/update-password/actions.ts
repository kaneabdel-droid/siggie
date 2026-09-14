'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()
  const password = formData.get('password') as string
  const isAdmin = formData.get('admin') === '1'

  const { error } = await supabase.auth.updateUser({
    password: password
  })

  if (error) {
    const params = new URLSearchParams({ message: error.message })
    if (isAdmin) params.set('admin', '1')
    return redirect(`/update-password?${params.toString()}`)
  }

  return redirect(
    `${isAdmin ? '/admin/login' : '/login'}?message=${encodeURIComponent('Mot de passe mis à jour avec succès.')}`
  )
}
