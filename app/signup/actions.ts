'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: {
        gie_nom: formData.get('gie_nom') as string,
        plan: formData.get('plan') as string || 'standard'
      },
      // Passe par /auth/callback pour échanger le code Supabase contre une session
      // avant d'atterrir sur /login — sans ça, le lien de confirmation renvoie un
      // visiteur déconnecté vers la page d'accueil.
      emailRedirectTo: `${siteUrl}/auth/callback?next=/login`,
    }
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    return redirect('/signup?message=' + encodeURIComponent(error.message))
  }

  // Si l'inscription réussit, on redirige vers le login avec un message demandant la confirmation
  return redirect('/login?message=' + encodeURIComponent("Compte créé avec succès ! Un lien de confirmation a été envoyé à votre adresse e-mail. Vous devez cliquer sur ce lien avant de pouvoir vous connecter."))
}
