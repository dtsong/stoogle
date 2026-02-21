export type NextSiteResult = {
  id: string
  url: string
  name: string
} | null

type SiteQueryClient = {
  from(table: 'sites'): {
    select(columns: string): {
      eq(column: string, value: boolean): {
        order(column: string, options: { ascending: boolean; nullsFirst: boolean }): {
          limit(count: number): Promise<{
            data: Array<{ id: string; url: string; name: string }> | null
            error: { message: string } | null
          }>
        }
      }
    }
  }
  rpc(
    fn: string,
    args: Record<string, unknown>
  ): Promise<{ data: unknown; error: { message: string } | null }>
}

export async function selectNextSite(
  client: SiteQueryClient
): Promise<NextSiteResult> {
  const { data, error } = await client
    .from('sites')
    .select('id, url, name')
    .eq('is_active', true)
    .order('updated_at', { ascending: true, nullsFirst: true })
    .limit(1)

  if (error) {
    throw new Error(`Failed to select next site: ${error.message}`)
  }

  if (!data || data.length === 0) {
    return null
  }

  return data[0]
}
