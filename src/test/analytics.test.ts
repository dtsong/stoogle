import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { executeClickAction } from '@/lib/analytics/click-action'
import {
  searchToClickRate,
  weeklyActiveQueries,
  zeroResultsRate,
} from '@/lib/analytics/metrics'
import type { SearchLogRow } from '@/lib/analytics/metrics'

// ───────────────────────────────────────────────
// Click action tests
// ───────────────────────────────────────────────

function mockLogger(error: { message: string } | null = null) {
  const insertFn = vi.fn().mockResolvedValue({ error })
  return {
    logger: { from: () => ({ insert: insertFn }) },
    insertFn,
  }
}

describe('executeClickAction', () => {
  it('persists click with required fields', async () => {
    const { logger, insertFn } = mockLogger()

    const result = await executeClickAction(
      { query: 'apologetics', clicked_url: 'https://example.com/page', click_position: 2 },
      logger
    )

    expect(result).toEqual({ ok: true, error: null })
    expect(insertFn).toHaveBeenCalledWith({
      query: 'apologetics',
      result_count: 0,
      clicked_url: 'https://example.com/page',
      click_position: 2,
    })
  })

  it('rejects empty query', async () => {
    const result = await executeClickAction({
      query: '  ',
      clicked_url: 'https://example.com',
      click_position: 0,
    })

    expect(result.ok).toBe(false)
    expect(result.error).toBe('Missing required fields.')
  })

  it('rejects empty clicked_url', async () => {
    const result = await executeClickAction({
      query: 'test',
      clicked_url: '',
      click_position: 0,
    })

    expect(result.ok).toBe(false)
    expect(result.error).toBe('Missing required fields.')
  })

  it('rejects negative click position', async () => {
    const result = await executeClickAction({
      query: 'test',
      clicked_url: 'https://example.com',
      click_position: -1,
    })

    expect(result.ok).toBe(false)
    expect(result.error).toBe('Invalid click position.')
  })

  it('rejects non-integer click position', async () => {
    const result = await executeClickAction({
      query: 'test',
      clicked_url: 'https://example.com',
      click_position: 1.5,
    })

    expect(result.ok).toBe(false)
    expect(result.error).toBe('Invalid click position.')
  })

  it('handles database insert error', async () => {
    const { logger } = mockLogger({ message: 'DB error' })

    const result = await executeClickAction(
      { query: 'test', clicked_url: 'https://example.com', click_position: 0 },
      logger
    )

    expect(result.ok).toBe(false)
    expect(result.error).toBe('Failed to log click.')
  })
})

// ───────────────────────────────────────────────
// Metric calculation tests
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

describe('searchToClickRate', () => {
  it('returns 0 for no searches', () => {
    expect(searchToClickRate([])).toBe(0)
  })

  it('returns 0 when no clicks', () => {
    const logs = [makeLog(), makeLog()]
    expect(searchToClickRate(logs)).toBe(0)
  })

  it('calculates CTR correctly', () => {
    const logs = [
      makeLog(), // search
      makeLog(), // search
      makeLog({ clicked_url: 'https://a.com', click_position: 0 }), // click
    ]
    expect(searchToClickRate(logs)).toBe(0.5)
  })

  it('handles all clicks no searches', () => {
    const logs = [
      makeLog({ clicked_url: 'https://a.com', click_position: 0 }),
    ]
    expect(searchToClickRate(logs)).toBe(0)
  })
})

describe('weeklyActiveQueries', () => {
  const now = new Date('2026-02-21T12:00:00Z')

  it('returns 0 for empty logs', () => {
    expect(weeklyActiveQueries([], now)).toBe(0)
  })

  it('counts distinct queries in past 7 days', () => {
    const logs = [
      makeLog({ query: 'alpha', created_at: '2026-02-20T10:00:00Z' }),
      makeLog({ query: 'alpha', created_at: '2026-02-19T10:00:00Z' }),
      makeLog({ query: 'beta', created_at: '2026-02-18T10:00:00Z' }),
    ]
    expect(weeklyActiveQueries(logs, now)).toBe(2)
  })

  it('excludes logs older than 7 days', () => {
    const logs = [
      makeLog({ query: 'old', created_at: '2026-02-10T10:00:00Z' }),
      makeLog({ query: 'recent', created_at: '2026-02-20T10:00:00Z' }),
    ]
    expect(weeklyActiveQueries(logs, now)).toBe(1)
  })

  it('excludes click log rows', () => {
    const logs = [
      makeLog({ query: 'search', created_at: '2026-02-20T10:00:00Z' }),
      makeLog({
        query: 'search',
        clicked_url: 'https://a.com',
        click_position: 0,
        created_at: '2026-02-20T11:00:00Z',
      }),
    ]
    expect(weeklyActiveQueries(logs, now)).toBe(1)
  })
})

describe('zeroResultsRate', () => {
  it('returns 0 for empty logs', () => {
    expect(zeroResultsRate([])).toBe(0)
  })

  it('returns 0 when all searches have results', () => {
    const logs = [makeLog({ result_count: 5 }), makeLog({ result_count: 3 })]
    expect(zeroResultsRate(logs)).toBe(0)
  })

  it('calculates rate correctly', () => {
    const logs = [
      makeLog({ result_count: 0 }),
      makeLog({ result_count: 5 }),
      makeLog({ result_count: 0 }),
    ]
    expect(zeroResultsRate(logs)).toBeCloseTo(2 / 3)
  })

  it('excludes click rows from calculation', () => {
    const logs = [
      makeLog({ result_count: 0 }),
      makeLog({ result_count: 5 }),
      makeLog({ clicked_url: 'https://a.com', click_position: 0, result_count: 0 }),
    ]
    expect(zeroResultsRate(logs)).toBe(0.5)
  })
})

// ───────────────────────────────────────────────
// Migration verification
// ───────────────────────────────────────────────

describe('migration 005', () => {
  it('adds clicked_url and click_position columns', () => {
    const sql = readFileSync('supabase/migrations/005_analytics_columns.sql', 'utf8')

    expect(sql).toContain('clicked_url')
    expect(sql).toContain('click_position')
    expect(sql).toContain('ALTER TABLE public.search_logs')
  })
})
