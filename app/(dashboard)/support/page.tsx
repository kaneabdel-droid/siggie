import { Phone, Mail, MapPin, LifeBuoy } from 'lucide-react'
import ContactForm from './ContactForm'

export const metadata = {
  title: 'Aide & Support - SIGGIE',
}

export default function SupportPage() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="sm:flex sm:items-center justify-between border-b border-surface-border pb-6">
        <div className="sm:flex-auto">
          <h2 className="text-2xl font-bold font-heading text-foreground flex items-center gap-2">
            <LifeBuoy className="h-6 w-6 text-primary" />
            Aide & Support
          </h2>
          <p className="mt-2 text-sm text-foreground-muted">
            Besoin d'aide pour utiliser SIGGIE ? Notre équipe est à votre disposition pour vous accompagner.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contact Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-surface border border-surface-border rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-foreground mb-6">Nos coordonnées</h3>
            
            <dl className="space-y-6">
              <div className="flex gap-4">
                <dt className="mt-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Phone className="h-5 w-5 text-primary" aria-hidden="true" />
                  </div>
                </dt>
                <dd>
                  <p className="text-sm font-semibold text-foreground">Téléphone</p>
                  <p className="mt-1 text-sm text-foreground-muted">Lun-Ven de 8h à 18h</p>
                  <p className="mt-1 font-medium text-foreground">
                    <a href="tel:+221770000000" className="hover:text-primary transition-colors">+221 77 000 00 00</a>
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
                  <p className="text-sm font-semibold text-foreground">Email</p>
                  <p className="mt-1 text-sm text-foreground-muted">Assistance technique</p>
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
                  <p className="text-sm font-semibold text-foreground">Bureau</p>
                  <p className="mt-1 text-sm text-foreground-muted">
                    Dakar, Sénégal
                  </p>
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-surface border border-surface-border rounded-lg shadow-sm p-6 bg-gradient-to-br from-surface to-primary/5">
            <h3 className="text-base font-semibold text-foreground">Ressources utiles</h3>
            <p className="mt-2 text-sm text-foreground-muted">
              Consultez notre guide d'utilisation ou notre FAQ pour trouver rapidement des réponses à vos questions.
            </p>
            <div className="mt-4">
              <a href="#" className="text-sm font-medium text-primary hover:text-primary-hover transition-colors">
                Voir la documentation &rarr;
              </a>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-2">
          <div className="bg-surface border border-surface-border rounded-lg shadow-sm p-6 sm:p-8">
            <h3 className="text-lg font-semibold text-foreground mb-2">Envoyez-nous un message</h3>
            <p className="text-sm text-foreground-muted mb-8">
              Vous rencontrez un bug ou avez une question spécifique ? Remplissez ce formulaire et nous vous répondrons directement par email.
            </p>
            
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  )
}
