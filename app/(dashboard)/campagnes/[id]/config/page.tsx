import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users } from 'lucide-react'
import MembreToggle from './MembreToggle'
import CampagneIntrantsManager from './CampagneIntrantsManager'
import { getDictionary, getLocale } from '@/dictionaries'

export default async function CampagneConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params
  const locale = await getLocale()
  const dict = await getDictionary(locale)
  const t = dict.campagnes_detail.config

  const { data: campagne } = await supabase
    .from('campagnes')
    .select('*')
    .eq('id', id)
    .single()

  if (!campagne) {
    notFound()
  }

  // Fetch active members of the GIE (les membres inactifs ne peuvent pas être inscrits à une campagne)
  const { data: membres } = await supabase
    .from('membres')
    .select('*')
    .eq('statut', 'actif')
    .order('prenom', { ascending: true })

  // Fetch already enrolled members for this campaign
  const { data: enrolledData } = await supabase
    .from('campagne_membres')
    .select('membre_id')
    .eq('campagne_id', id)

  const enrolledIds = new Set(enrolledData?.map(e => e.membre_id) || [])

  const totalInscrits = enrolledIds.size
  const totalMembres = membres?.length || 0

  // Fetch all intrants of the GIE
  const { data: intrants } = await supabase
    .from('intrants')
    .select('*')
    .order('nom', { ascending: true })

  // Fetch campaign intrants
  const { data: campagneIntrants } = await supabase
    .from('campagne_intrants')
    .select('id, intrant_id, prix_facturation, intrants(nom, type_intrant)')
    .eq('campagne_id', id)

  return (
    <div>
      <div className="mb-6">
        <Link href="/campagnes" className="text-sm font-medium text-primary hover:text-primary-hover flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          {dict.campagnes_detail.back}
        </Link>
      </div>

      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h2 className="text-2xl font-bold font-heading text-foreground">
            {t.title} {campagne.nom}
          </h2>
          <p className="mt-2 text-sm text-foreground-muted">
            {t.desc}
          </p>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg bg-surface px-4 py-5 shadow sm:p-6 border border-surface-border flex items-center gap-4">
        <div className="rounded-md bg-secondary/20 p-3 shrink-0">
          <Users className="h-6 w-6 text-secondary" aria-hidden="true" />
        </div>
          <div className="min-w-0">
            <dt className="truncate text-sm font-medium text-foreground-muted">{t.enrollment_rate}</dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight text-foreground truncate">
            {totalInscrits} / {totalMembres} {t.members_unit}
          </dd>
        </div>
      </div>

      <div className="mt-8">
        <CampagneIntrantsManager
          campagneId={id}
          intrants={intrants || []}
          campagneIntrants={(campagneIntrants as any) || []}
          dict={dict}
        />
      </div>

      <div className="mt-8 flow-root">
        <div className="sm:flex sm:items-center mb-4">
          <div className="sm:flex-auto">
            <h3 className="text-base font-semibold leading-6 text-foreground">{t.enrolled_title}</h3>
          </div>
        </div>
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden overflow-x-auto shadow ring-1 ring-surface-border sm:rounded-lg bg-surface">
              <table className="min-w-full divide-y divide-surface-border">
                <thead className="bg-background/50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-foreground sm:pl-6">{t.headers.member}</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">{t.headers.code}</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-foreground">{t.headers.village}</th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-foreground">{t.headers.enrolled}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border bg-surface">
                  {membres && membres.length > 0 ? (
                    membres.map((membre) => {
                      const isEnrolled = enrolledIds.has(membre.id)
                      return (
                        <tr key={membre.id} className="hover:bg-background/50 transition-colors">
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-foreground sm:pl-6">
                            {membre.prenom} {membre.nom}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground-muted">
                            {membre.code_membre}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-foreground-muted">
                            {membre.village}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-right">
                            <MembreToggle
                              campagneId={id}
                              membreId={membre.id}
                              isEnrolledInitial={isEnrolled}
                            />
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="whitespace-nowrap py-8 text-center text-sm text-foreground-muted">
                        {t.empty}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
