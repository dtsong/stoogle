import type { SearchLogRow } from '@/lib/analytics/metrics'
import { zeroResultsRate, searchToClickRate } from '@/lib/analytics/metrics'

export type FeedbackIssue = {
  id: string
  title: string
  source: 'report-flag' | 'metrics' | 'user-feedback'
  severity: 'p0' | 'p1' | 'p2'
  status: 'open' | 'fixed' | 'wontfix'
}

export type MetricsDerivedIssues = {
  highZeroResultsRate: boolean
  lowClickThroughRate: boolean
  topZeroResultQueries: string[]
}

export function deriveIssuesFromMetrics(logs: SearchLogRow[]): MetricsDerivedIssues {
  const searches = logs.filter((l) => l.clicked_url === null && l.click_position === null)
  const zrr = zeroResultsRate(logs)
  const ctr = searchToClickRate(logs)

  const zeroResultQueries = searches
    .filter((l) => l.result_count === 0)
    .map((l) => l.query)

  const uniqueZeroQueries = [...new Set(zeroResultQueries)]
    .slice(0, 10)

  return {
    highZeroResultsRate: zrr > 0.15,
    lowClickThroughRate: ctr < 0.4,
    topZeroResultQueries: uniqueZeroQueries,
  }
}
