import { redirect } from 'next/navigation'

export default async function CampagneSuperficiesRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/superficies?campagne_id=${id}`)
}
