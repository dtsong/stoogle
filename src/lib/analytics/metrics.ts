/**
 * Analytics metric calculation helpers.
 *
 * SQL equivalents documented inline for running directly against Supabase.
 */

export type SearchLogRow = {
  query: string
  result_count: number
  clicked_url: string | null
  click_position: number | null
  created_at: string
}

/**
 * Search-to-click rate (CTR): fraction of searches that led to a click.
 *
 * SQL:
 *   SELECT
 *     COUNT(DISTINCT CASE WHEN clicked_url IS NOT NULL THEN id END)::float
 *     / NULLIF(COUNT(DISTINCT CASE WHEN clicked_url IS NULL AND click_position IS NULL THEN id END), 0)
 *     AS ctr
 *   FROM search_logs
 *   WHERE created_at >= NOW() - INTERVAL '7 days';
 */
export function searchToClickRate(logs: SearchLogRow[]): number {
  const searches = logs.filter((l) => l.clicked_url === null && l.click_position === null)
  const clicks = logs.filter((l) => l.clicked_url !== null)

  if (searches.length === 0) return 0
  return clicks.length / searches.length
}

/**
 * Weekly active queries: count of distinct queries in the past 7 days.
 *
 * SQL:
 *   SELECT COUNT(DISTINCT query) AS weekly_active_queries
 *   FROM search_logs
 *   WHERE clicked_url IS NULL
 *     AND created_at >= NOW() - INTERVAL '7 days';
 */
export function weeklyActiveQueries(logs: SearchLogRow[], asOf?: Date): number {
  const cutoff = new Date(asOf ?? new Date())
  cutoff.setDate(cutoff.getDate() - 7)

  const recent = logs.filter(
    (l) => l.clicked_url === null && new Date(l.created_at) >= cutoff
  )

  return new Set(recent.map((l) => l.query)).size
}

/**
 * Zero-results rate: fraction of searches that returned no results.
 *
 * SQL:
 *   SELECT
 *     COUNT(CASE WHEN result_count = 0 THEN 1 END)::float
 *     / NULLIF(COUNT(*), 0)
 *     AS zero_results_rate
 *   FROM search_logs
 *   WHERE clicked_url IS NULL;
 */
export function zeroResultsRate(logs: SearchLogRow[]): number {
  const searches = logs.filter((l) => l.clicked_url === null && l.click_position === null)
  if (searches.length === 0) return 0
  return searches.filter((l) => l.result_count === 0).length / searches.length
}
