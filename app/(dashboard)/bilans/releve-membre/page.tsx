import { redirect } from 'next/navigation'

export default async function RedirectReleveMembre({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | undefined }>
}) {
  const params = await searchParams
  const query = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
  redirect(`/membres/releves${query ? `?${query}` : ''}`)
}
