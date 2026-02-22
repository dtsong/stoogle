import type { SearchLogRow } from './metrics'
import { searchToClickRate, weeklyActiveQueries, zeroResultsRate } from './metrics'

export type MetricThreshold = {
  name: string
  value: number
  target: number
  operator: 'lte' | 'gte'
  pass: boolean
}

export type MetricsReport = {
  zeroResultsRate: MetricThreshold
  searchToClickRate: MetricThreshold
  weeklyActiveQueries: MetricThreshold
  overall: boolean
}

export const LAUNCH_TARGETS = {
  maxZeroResultsRate: 0.15,
  minSearchToClickRate: 0.4,
  minWeeklyActiveQueries: 100,
} as const

export function evaluateMetrics(logs: SearchLogRow[], asOf?: Date): MetricsReport {
  const zrr = zeroResultsRate(logs)
  const ctr = searchToClickRate(logs)
  const waq = weeklyActiveQueries(logs, asOf)

  const zeroResults: MetricThreshold = {
    name: 'Zero-results rate',
    value: zrr,
    target: LAUNCH_TARGETS.maxZeroResultsRate,
    operator: 'lte',
    pass: zrr <= LAUNCH_TARGETS.maxZeroResultsRate,
  }

  const clickRate: MetricThreshold = {
    name: 'Search-to-click rate',
    value: ctr,
    target: LAUNCH_TARGETS.minSearchToClickRate,
    operator: 'gte',
    pass: ctr >= LAUNCH_TARGETS.minSearchToClickRate,
  }

  const activeQueries: MetricThreshold = {
    name: 'Weekly active queries',
    value: waq,
    target: LAUNCH_TARGETS.minWeeklyActiveQueries,
    operator: 'gte',
    pass: waq >= LAUNCH_TARGETS.minWeeklyActiveQueries,
  }

  return {
    zeroResultsRate: zeroResults,
    searchToClickRate: clickRate,
    weeklyActiveQueries: activeQueries,
    overall: zeroResults.pass && clickRate.pass && activeQueries.pass,
  }
}
