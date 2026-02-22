import { describe, expect, it } from 'vitest'
import { deriveIssuesFromMetrics } from '@/lib/feedback/tracker'
import type { SearchLogRow } from '@/lib/analytics/metrics'

function makeLog(overrides: Partial<SearchLogRow> = {}): SearchLogRow {
  return {
    query: 'test',
    result_count: 5,
    clicked_url: null,
    click_position: null,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('deriveIssuesFromMetrics', () => {
  it('flags high zero-results rate', () => {
    const logs: SearchLogRow[] = [
      makeLog({ query: 'bad1', result_count: 0 }),
      makeLog({ query: 'bad2', result_count: 0 }),
      makeLog({ query: 'good', result_count: 5 }),
    ]

    const issues = deriveIssuesFromMetrics(logs)
    expect(issues.highZeroResultsRate).toBe(true)
    expect(issues.topZeroResultQueries).toContain('bad1')
    expect(issues.topZeroResultQueries).toContain('bad2')
  })

  it('does not flag when zero-results rate is acceptable', () => {
    const logs: SearchLogRow[] = [
      makeLog({ result_count: 0 }),
      ...Array.from({ length: 20 }, () => makeLog({ result_count: 5 })),
    ]

    const issues = deriveIssuesFromMetrics(logs)
    expect(issues.highZeroResultsRate).toBe(false)
  })

  it('flags low click-through rate', () => {
    const logs: SearchLogRow[] = [
      makeLog(),
      makeLog(),
      makeLog(),
    ]

    const issues = deriveIssuesFromMetrics(logs)
    expect(issues.lowClickThroughRate).toBe(true)
  })

  it('does not flag when CTR is healthy', () => {
    const logs: SearchLogRow[] = [
      makeLog({ query: 'q1' }),
      makeLog({ query: 'q1', clicked_url: 'https://a.com', click_position: 0 }),
    ]

    const issues = deriveIssuesFromMetrics(logs)
    expect(issues.lowClickThroughRate).toBe(false)
  })

  it('limits top zero-result queries to 10', () => {
    const logs = Array.from({ length: 15 }, (_, i) =>
      makeLog({ query: `missing${i}`, result_count: 0 })
    )

    const issues = deriveIssuesFromMetrics(logs)
    expect(issues.topZeroResultQueries.length).toBeLessThanOrEqual(10)
  })

  it('deduplicates zero-result queries', () => {
    const logs: SearchLogRow[] = [
      makeLog({ query: 'same', result_count: 0 }),
      makeLog({ query: 'same', result_count: 0 }),
      makeLog({ query: 'same', result_count: 0 }),
    ]

    const issues = deriveIssuesFromMetrics(logs)
    expect(issues.topZeroResultQueries).toEqual(['same'])
  })
})
