import { redirect } from 'next/navigation'

export default async function RedirectReleveFournisseur({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | undefined }>
}) {
  const params = await searchParams
  const query = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
  redirect(`/tiers-od/releve-fournisseur${query ? `?${query}` : ''}`)
}
