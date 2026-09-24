'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Send, CheckCircle2 } from 'lucide-react'
import type { getDictionary } from '@/dictionaries'
import { envoyerContactProspect } from '@/app/actions/contact'

type ContactDict = Awaited<ReturnType<typeof getDictionary>>['landing']['contact']

const PRODUITS = ['SIGGIE', 'D-QUINCA', 'D-INTRANTS', 'D-AGROBUSINESS']

const champ =
  'mt-2 block w-full rounded-lg border border-surface-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50'

export default function ContactProspectForm({ t }: { t: ContactDict }) {
  const [isPending, startTransition] = useTransition()
  const [envoye, setEnvoye] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Horodatage d'affichage du formulaire (anti-robot, cf. app/actions/contact.ts).
  const ouvertLe = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (ouvertLe.current) ouvertLe.current.value = String(Date.now())
  }, [envoye])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const form = e.currentTarget
    const formData = new FormData(form)

    startTransition(async () => {
      const result = await envoyerContactProspect(formData)
      if (result.error) {
        setError(result.error)
      } else {
        form.reset()
        setEnvoye(true)
      }
    })
  }

  if (envoye) {
    return (
      <div className="rounded-xl border border-success/20 bg-success/10 p-8 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-success" />
        <h3 className="text-lg font-semibold text-success">{t.sent_title}</h3>
        <p className="mt-2 text-sm text-foreground-muted">{t.sent_desc}</p>
        <button
          type="button"
          onClick={() => setEnvoye(false)}
          className="mt-4 text-sm font-medium text-primary hover:underline"
        >
          {t.send_another}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg border border-danger/20 bg-danger/10 p-4">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {/* Anti-robot : champ invisible pour un humain + horodatage d'ouverture. */}
      <input ref={ouvertLe} type="hidden" name="ouvert_le" />
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="site_web">Site web</label>
        <input id="site_web" name="site_web" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-nom" className="block text-sm font-medium text-foreground">{t.name}</label>
          <input id="contact-nom" name="nom" type="text" required maxLength={120} autoComplete="name"
            disabled={isPending} placeholder={t.name_placeholder} className={champ} />
        </div>
        <div>
          <label htmlFor="contact-email" className="block text-sm font-medium text-foreground">{t.email_label}</label>
          <input id="contact-email" name="email" type="email" required maxLength={200} autoComplete="email" dir="ltr"
            disabled={isPending} placeholder={t.email_placeholder} className={champ} />
        </div>
        <div>
          <label htmlFor="contact-tel" className="block text-sm font-medium text-foreground">{t.phone_label}</label>
          <input id="contact-tel" name="telephone" type="tel" maxLength={30} autoComplete="tel" dir="ltr"
            disabled={isPending} placeholder="+221 ..." className={champ} />
        </div>
        <div>
          <label htmlFor="contact-produit" className="block text-sm font-medium text-foreground">{t.product}</label>
          <select id="contact-produit" name="produit" defaultValue="" disabled={isPending} className={champ}>
            <option value="">{t.product_any}</option>
            {PRODUITS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="contact-message" className="block text-sm font-medium text-foreground">{t.message}</label>
        <textarea id="contact-message" name="message" rows={5} required maxLength={5000}
          disabled={isPending} placeholder={t.message_placeholder} className={champ} />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {isPending ? t.sending : (
            <>
              <Send className="h-4 w-4 rtl:-scale-x-100" />
              {t.send}
            </>
          )}
        </button>
      </div>
    </form>
  )
}
