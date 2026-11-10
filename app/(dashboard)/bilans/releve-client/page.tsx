import { redirect } from 'next/navigation'

export default async function RedirectReleveClient({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | undefined }>
}) {
  const params = await searchParams
  const query = params ? new URLSearchParams(params as Record<string, string>).toString() : ''
  redirect(`/tiers-od/releve-client${query ? `?${query}` : ''}`)
}
