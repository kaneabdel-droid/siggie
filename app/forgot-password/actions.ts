'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import { estEmailSynthetique, normaliserIdentifiant } from '@/lib/auth-identifier'

export async function resetPasswordForEmail(formData: FormData) {
  const supabase = await createClient()
  const rawInput = ((formData.get('email') as string) || '').trim()
  const isAdmin = formData.get('admin') === '1'
  const adminQuery = isAdmin ? '?admin=1' : ''

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const next = encodeURIComponent(`/update-password${adminQuery}`)
  const redirectTo = `${siteUrl}/auth/callback?next=${next}`

  // 1. Si la saisie est manifestement une adresse e-mail réelle (contient '@' sans être notre domaine interne)
  if (rawInput.includes('@') && !estEmailSynthetique(rawInput)) {
    const { error } = await supabase.auth.resetPasswordForEmail(rawInput, {
      redirectTo,
    })

    if (error) {
      const params = new URLSearchParams({ message: error.message })
      if (isAdmin) params.set('admin', '1')
      return redirect(`/forgot-password?${params.toString()}`)
    }

    return redirect(
      `${isAdmin ? '/admin/login' : '/login'}?message=${encodeURIComponent(
        'Vérifiez votre boîte mail pour le lien de réinitialisation.'
      )}`
    )
  }

  // 2. Traitement d'un identifiant ou numéro de téléphone (compte collaborateur sans e-mail obligatoire)
  const clean = normaliserIdentifiant(rawInput)

  try {
    const adminSupabase = createAdminClient()

    // Recherche de l'utilisateur et de son GIE rattaché
    const { data: userRow } = await adminSupabase
      .from('utilisateurs')
      .select('id, identifiant, telephone, nom_complet, gie_id, gies(nom, email)')
      .or(`identifiant.ilike.${clean},telephone.eq.${clean}`)
      .maybeSingle()

    if (userRow?.id) {
      const { data: authUser } = await adminSupabase.auth.admin.getUserById(userRow.id)
      const userAuthEmail = authUser?.user?.email

      if (userAuthEmail) {
        // Cas A : L'utilisateur a une adresse e-mail réelle enregistrée
        if (!estEmailSynthetique(userAuthEmail)) {
          await supabase.auth.resetPasswordForEmail(userAuthEmail, { redirectTo })
          return redirect(
            `/login?message=${encodeURIComponent(
              'Un lien de réinitialisation a été envoyé à votre adresse e-mail.'
            )}`
          )
        }

        // Cas B : Compte collaborateur sans e-mail (utilise un alias interne)
        // Génération du lien magique de récupération sécurisé
        const { data: linkData } = await adminSupabase.auth.admin.generateLink({
          type: 'recovery',
          email: userAuthEmail,
          options: { redirectTo },
        })

        const recoveryLink = linkData?.properties?.action_link

        if (recoveryLink) {
          // Trouver l'administrateur client du GIE pour lui notifier le lien
          const gieData = Array.isArray(userRow.gies) ? userRow.gies[0] : userRow.gies
          let adminEmail = gieData?.email as string | undefined

          if (!adminEmail && userRow.gie_id) {
            const { data: adminUsers } = await adminSupabase
              .from('utilisateurs')
              .select('id')
              .eq('gie_id', userRow.gie_id)
              .eq('role', 'admin')
              .limit(5)

            for (const adm of adminUsers ?? []) {
              const { data: admAuth } = await adminSupabase.auth.admin.getUserById(adm.id)
              if (admAuth?.user?.email && !estEmailSynthetique(admAuth.user.email)) {
                adminEmail = admAuth.user.email
                break
              }
            }
          }

          // Si un e-mail d'administrateur est trouvé, on lui envoie le lien par e-mail
          if (adminEmail && process.env.RESEND_API_KEY) {
            const supportFrom =
              process.env.SUPPORT_FROM_EMAIL || 'DembaSolution Support <noreply@dembasolution.com>'
            const gieNom = gieData?.nom || 'votre GIE'
            const employeNom = userRow.nom_complet || userRow.identifiant || 'Un collaborateur'

            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: supportFrom,
                to: [adminEmail],
                subject: `[SIGGIE] Réinitialisation de mot de passe pour ${employeNom}`,
                html: `
                  <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e2e8f0;border-radius:10px;">
                    <h2 style="color:#10b981;margin-bottom:8px;">DembaSolution - Assistance Mot de Passe</h2>
                    <p>Bonjour,</p>
                    <p>Votre collaborateur <strong>${employeNom}</strong> (Identifiant : <code>${userRow.identifiant || userRow.telephone}</code>) de <strong>${gieNom}</strong> a demandé à réinitialiser son mot de passe de connexion.</p>
                    <p>N'ayant pas d'adresse e-mail personnelle, vous recevez son lien magique sécurisé en tant qu'administrateur client du compte :</p>
                    <div style="margin:24px 0;text-align:center;">
                      <a href="${recoveryLink}" style="background:#10b981;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">
                        Ouvrir le lien de réinitialisation
                      </a>
                    </div>
                    <p style="font-size:13px;color:#64748b;line-height:1.5;">Vous pouvez également lui copier-coller directement ce lien par WhatsApp ou SMS :<br/><a href="${recoveryLink}">${recoveryLink}</a></p>
                    <p style="font-size:12px;color:#94a3b8;margin-top:24px;">Ce lien temporaire permet de définir un nouveau mot de passe.</p>
                  </div>
                `,
              }),
            })
          }

          return redirect(
            `/login?message=${encodeURIComponent(
              "Demande transmise avec succès ! Un lien de réinitialisation a été envoyé à l'administrateur de votre GIE. Veuillez le contacter pour obtenir votre accès."
            )}`
          )
        }
      }
    }
  } catch (err) {
    console.error('[forgot-password] Erreur de résolution :', err)
  }

  // Réponse générique pour éviter l'énumération des comptes
  return redirect(
    `/login?message=${encodeURIComponent(
      'Si cet identifiant correspond à un compte actif, les instructions de réinitialisation ont été transmises à votre administrateur.'
    )}`
  )
}
