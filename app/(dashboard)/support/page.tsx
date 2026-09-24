import { Phone, Mail, LifeBuoy } from 'lucide-react'
import ContactForm from './ContactForm'
import { getDictionary, getLocale } from '@/dictionaries'

export const metadata = {
  title: 'Aide & Support - SIGGIE',
}

export default async function SupportPage() {
  const locale = await getLocale()
  const dict = await getDictionary(locale)

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="sm:flex sm:items-center justify-between border-b border-surface-border pb-6">
        <div className="sm:flex-auto">
          <h2 className="text-2xl font-bold font-heading text-foreground flex items-center gap-2">
            <LifeBuoy className="h-6 w-6 text-primary" />
            {dict.support.title}
          </h2>
          <p className="mt-2 text-sm text-foreground-muted">
            {dict.support.desc}
          </p>
        </div>
      </div>

      {/* Coordonnées : côte à côte au-dessus du formulaire, pour que l'adresse email tienne sur une ligne. */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="flex items-start gap-4 bg-surface border border-surface-border rounded-lg shadow-sm p-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Phone className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{dict.support.phone}</p>
            <p className="mt-1 text-sm text-foreground-muted">{dict.support.phone_hours}</p>
            <p className="mt-1 font-medium text-foreground" dir="ltr">
              <a href="tel:+221708484298" className="hover:text-primary transition-colors">+221 70 848 42 98</a>
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 bg-surface border border-surface-border rounded-lg shadow-sm p-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-info/10">
            <Mail className="h-5 w-5 text-info" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{dict.support.email}</p>
            <p className="mt-1 text-sm text-foreground-muted">{dict.support.email_desc}</p>
            <p className="mt-1 font-medium text-foreground" dir="ltr">
              <a href="mailto:support@dembasolution.com" className="hover:text-primary transition-colors">support@dembasolution.com</a>
            </p>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-surface-border rounded-lg shadow-sm p-6 sm:p-8">
        <h3 className="text-lg font-semibold text-foreground mb-2">{dict.support.form_title}</h3>
        <p className="text-sm text-foreground-muted mb-8">
          {dict.support.form_desc}
        </p>

        <ContactForm dict={dict} />
      </div>
    </div>
  )
}
