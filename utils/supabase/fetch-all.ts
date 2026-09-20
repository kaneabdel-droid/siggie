import type { createClient } from './server'

type Client = Awaited<ReturnType<typeof createClient>>

// Supabase plafonne chaque requête à 1000 lignes : on pagine pour ne rien tronquer
// (les transactions ou factures d'un GIE dépassent vite ce seuil).
export async function fetchAll<T>(supabase: Client, table: string, columns: string): Promise<T[]> {
  const pas = 1000
  const rows: T[] = []
  for (let from = 0; ; from += pas) {
    const { data, error } = await supabase.from(table).select(columns).order('id').range(from, from + pas - 1)
    if (error) throw new Error(`${table} : ${error.message}`)
    rows.push(...((data ?? []) as T[]))
    if (!data || data.length < pas) break
  }
  return rows
}
