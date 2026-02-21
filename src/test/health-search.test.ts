import { describe, expect, it, vi } from 'vitest'
import { checkHealth } from '@/app/api/health/search/route'
import type { SearchAdapter } from '@/lib/search/adapter'

function mockAdapter(search: SearchAdapter['search']): SearchAdapter {
  return { search }
}

describe('GET /api/health/search', () => {
  it('returns 200 with latency when Typesense is healthy', async () => {
    const adapter = mockAdapter(vi.fn().mockResolvedValue({ found: 0, results: [] }))

    const response = await checkHealth(adapter)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.status).toBe('ok')
    expect(typeof body.latency_ms).toBe('number')
    expect(body.latency_ms).toBeGreaterThanOrEqual(0)
  })

  it('returns 503 with error message when Typesense is unreachable', async () => {
    const adapter = mockAdapter(vi.fn().mockRejectedValue(new Error('Connection refused')))

    const response = await checkHealth(adapter)
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.status).toBe('error')
    expect(body.message).toBe('Connection refused')
  })

  it('returns 503 when search exceeds timeout', async () => {
    const adapter = mockAdapter(
      vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 10_000))
      )
    )

    const response = await checkHealth(adapter)
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.status).toBe('error')
    expect(body.message).toBe('Health check timed out')
  }, 10_000)

  it('does not require authentication', async () => {
    const adapter = mockAdapter(vi.fn().mockResolvedValue({ found: 0, results: [] }))

    const response = await checkHealth(adapter)
    expect(response.status).toBe(200)
  })
})
