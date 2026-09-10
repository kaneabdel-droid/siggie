import { Phone, Mail, MapPin, LifeBuoy } from 'lucide-react'
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contact Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-surface border border-surface-border rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-foreground mb-6">{dict.support.contact_title}</h3>

            <dl className="space-y-6">
              <div className="flex gap-4">
                <dt className="mt-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Phone className="h-5 w-5 text-primary" aria-hidden="true" />
                  </div>
                </dt>
                <dd>
                  <p className="text-sm font-semibold text-foreground">{dict.support.phone}</p>
                  <p className="mt-1 text-sm text-foreground-muted">{dict.support.phone_hours}</p>
                  <p className="mt-1 font-medium text-foreground">
                    <a href="tel:+221775390196" className="hover:text-primary transition-colors">+221 77 539 01 96</a>
                  </p>
                </dd>
              </div>

              <div className="flex gap-4">
                <dt className="mt-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
                    <Mail className="h-5 w-5 text-info" aria-hidden="true" />
                  </div>
                </dt>
                <dd>
                  <p className="text-sm font-semibold text-foreground">{dict.support.email}</p>
                  <p className="mt-1 text-sm text-foreground-muted">{dict.support.email_desc}</p>
                  <p className="mt-1 font-medium text-foreground">
                    <a href="mailto:support@siggie.sn" className="hover:text-primary transition-colors">support@siggie.sn</a>
                  </p>
                </dd>
              </div>

              <div className="flex gap-4">
                <dt className="mt-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                    <MapPin className="h-5 w-5 text-success" aria-hidden="true" />
                  </div>
                </dt>
                <dd>
                  <p className="text-sm font-semibold text-foreground">{dict.support.office}</p>
                  <p className="mt-1 text-sm text-foreground-muted">
                    {dict.support.office_desc}
                  </p>
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-surface border border-surface-border rounded-lg shadow-sm p-6 bg-gradient-to-br from-surface to-primary/5">
            <h3 className="text-base font-semibold text-foreground">{dict.support.resources_title}</h3>
            <p className="mt-2 text-sm text-foreground-muted">
              {dict.support.resources_desc}
            </p>
            <div className="mt-4">
              <a href="#" className="text-sm font-medium text-primary hover:text-primary-hover transition-colors">
                {dict.support.doc_link} &rarr;
              </a>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-2">
          <div className="bg-surface border border-surface-border rounded-lg shadow-sm p-6 sm:p-8">
            <h3 className="text-lg font-semibold text-foreground mb-2">{dict.support.form_title}</h3>
            <p className="text-sm text-foreground-muted mb-8">
              {dict.support.form_desc}
            </p>

            <ContactForm dict={dict} />
          </div>
        </div>
      </div>
    </div>
  )
}
