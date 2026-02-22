import { describe, expect, it } from 'vitest'
import { evaluateMetrics, LAUNCH_TARGETS } from '@/lib/analytics/thresholds'
import type { SearchLogRow } from '@/lib/analytics/metrics'
import { fetchAndEvaluate } from '@/app/api/metrics/route'

// ───────────────────────────────────────────────
// Threshold evaluation tests
// ───────────────────────────────────────────────

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

describe('evaluateMetrics', () => {
  it('reports all passing when metrics meet targets', () => {
    const now = new Date()
    const recent = now.toISOString()
    // 100 unique searches
    const searches = Array.from({ length: 100 }, (_, i) =>
      makeLog({ query: `q${i}`, created_at: recent })
    )
    // 50 clicks (CTR = 50/100 = 50% > 40%)
    const clicks = Array.from({ length: 50 }, (_, i) =>
      makeLog({ query: `q${i}`, clicked_url: 'https://a.com', click_position: 0, created_at: recent })
    )
    const logs: SearchLogRow[] = [...searches, ...clicks]

    const report = evaluateMetrics(logs, now)
    expect(report.zeroResultsRate.pass).toBe(true)
    expect(report.searchToClickRate.pass).toBe(true)
    expect(report.weeklyActiveQueries.pass).toBe(true)
    expect(report.overall).toBe(true)
  })

  it('reports failing zero-results rate', () => {
    const logs: SearchLogRow[] = [
      makeLog({ result_count: 0 }),
      makeLog({ result_count: 0 }),
      makeLog({ result_count: 5 }),
    ]

    const report = evaluateMetrics(logs)
    expect(report.zeroResultsRate.pass).toBe(false)
    expect(report.zeroResultsRate.value).toBeCloseTo(2 / 3)
  })

  it('reports failing click-through rate', () => {
    const logs: SearchLogRow[] = [
      makeLog(),
      makeLog(),
      makeLog(),
    ]

    const report = evaluateMetrics(logs)
    expect(report.searchToClickRate.pass).toBe(false)
    expect(report.searchToClickRate.value).toBe(0)
  })

  it('reports failing weekly active queries', () => {
    const logs: SearchLogRow[] = [makeLog({ query: 'only-one' })]
    const report = evaluateMetrics(logs)
    expect(report.weeklyActiveQueries.pass).toBe(false)
    expect(report.weeklyActiveQueries.value).toBe(1)
  })
})

describe('launch targets', () => {
  it('defines correct thresholds per PRD', () => {
    expect(LAUNCH_TARGETS.maxZeroResultsRate).toBe(0.15)
    expect(LAUNCH_TARGETS.minSearchToClickRate).toBe(0.4)
    expect(LAUNCH_TARGETS.minWeeklyActiveQueries).toBe(100)
  })
})

// ───────────────────────────────────────────────
// Metrics API endpoint tests
// ───────────────────────────────────────────────

function mockClient(logs: SearchLogRow[], error: { message: string } | null = null) {
  return {
    from: () => ({
      select: () => ({
        gte: () => Promise.resolve({ data: error ? null : logs, error }),
      }),
    }),
  }
}

describe('fetchAndEvaluate', () => {
  it('returns metrics report with log count', async () => {
    const logs = [makeLog(), makeLog()]
    const response = await fetchAndEvaluate(mockClient(logs))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.period).toBe('7d')
    expect(body.totalLogs).toBe(2)
    expect(body.metrics).toBeDefined()
    expect(body.metrics.zeroResultsRate).toBeDefined()
    expect(body.metrics.searchToClickRate).toBeDefined()
    expect(body.metrics.weeklyActiveQueries).toBeDefined()
  })

  it('returns 500 on database error', async () => {
    const response = await fetchAndEvaluate(mockClient([], { message: 'DB down' }))
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe('DB down')
  })

  it('handles empty logs gracefully', async () => {
    const response = await fetchAndEvaluate(mockClient([]))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.totalLogs).toBe(0)
    expect(body.metrics.overall).toBe(false)
  })
})
