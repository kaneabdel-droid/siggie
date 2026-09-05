'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: {
        gie_nom: formData.get('gie_nom') as string,
        plan: formData.get('plan') as string || 'standard'
      },
    }
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    return redirect('/signup?message=' + encodeURIComponent(error.message))
  }

  // Si l'inscription réussit, on redirige vers le login avec un message demandant la confirmation
  return redirect('/login?message=' + encodeURIComponent("Compte créé avec succès ! Un lien de confirmation a été envoyé à votre adresse e-mail. Vous devez cliquer sur ce lien avant de pouvoir vous connecter."))
}
