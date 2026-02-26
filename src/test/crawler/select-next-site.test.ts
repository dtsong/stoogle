import { describe, it, expect } from 'vitest'
import { selectNextSite } from '@/lib/crawler/select-next-site'

function mockClient(result: {
  data: Array<{ id: string; url: string; name: string }> | null
  error: { message: string } | null
}) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => Promise.resolve(result),
          }),
        }),
      }),
    }),
    rpc: () => Promise.resolve({ data: null, error: null }),
  }
}

describe('selectNextSite', () => {
  it('returns first site when data available', async () => {
    const site = { id: '1', url: 'https://example.com', name: 'Example' }
    const result = await selectNextSite(mockClient({ data: [site], error: null }))
    expect(result).toEqual(site)
  })

  it('returns null when empty array', async () => {
    const result = await selectNextSite(mockClient({ data: [], error: null }))
    expect(result).toBeNull()
  })

  it('returns null when data is null', async () => {
    const result = await selectNextSite(mockClient({ data: null, error: null }))
    expect(result).toBeNull()
  })

  it('throws descriptive error when query errors', async () => {
    await expect(
      selectNextSite(mockClient({ data: null, error: { message: 'connection refused' } }))
    ).rejects.toThrow('Failed to select next site: connection refused')
  })
})
