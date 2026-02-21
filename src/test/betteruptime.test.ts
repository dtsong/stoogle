import { describe, expect, it, vi } from 'vitest'
import type { SearchAdapter } from '@/lib/search/adapter'
import { checkHealth } from '@/app/api/health/search/route'

function mockAdapter(overrides: Partial<SearchAdapter> = {}): SearchAdapter {
  return {
    search: vi.fn().mockResolvedValue({ found: 0, results: [], facets: { siteNames: [], categorySlugs: [] } }),
    ...overrides,
  } as SearchAdapter
}

describe('BetterUptime health endpoint compatibility', () => {
  it('returns 200 with JSON body on healthy search', async () => {
    const adapter = mockAdapter()
    const response = await checkHealth(adapter)

    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.status).toBe('ok')
    expect(typeof body.latency_ms).toBe('number')
  })

  it('returns 503 on search failure (triggers BetterUptime alert)', async () => {
    const adapter = mockAdapter({
      search: vi.fn().mockRejectedValue(new Error('Connection refused')),
    })
    const response = await checkHealth(adapter)

    expect(response.status).toBe(503)

    const body = await response.json()
    expect(body.status).toBe('error')
    expect(body.message).toBe('Connection refused')
  })

  it('returns 503 on timeout (triggers BetterUptime alert)', async () => {
    const adapter = mockAdapter({
      search: vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 10_000))
      ),
    })

    const response = await checkHealth(adapter)

    expect(response.status).toBe(503)

    const body = await response.json()
    expect(body.status).toBe('error')
    expect(body.message).toBe('Health check timed out')
  }, 10_000)

  it('response has correct content-type for monitoring services', async () => {
    const adapter = mockAdapter()
    const response = await checkHealth(adapter)

    expect(response.headers.get('content-type')).toContain('application/json')
  })

  it('includes keyword "ok" in healthy response for keyword monitoring', async () => {
    const adapter = mockAdapter()
    const response = await checkHealth(adapter)
    const text = await response.clone().text()

    expect(text).toContain('"ok"')
  })
})
