import { redirect } from 'next/navigation'

export default async function BilanAnnuelPage({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string }>
}) {
  const { annee } = await searchParams
  const query = annee ? `?annee=${annee}` : ''
  redirect(`/bilans/smt${query}`)
}
