import { describe, expect, it, vi } from 'vitest'
import { SearchAdapterError } from '@/lib/search/adapter'
import { TypesenseAdapter } from '@/lib/search/typesense-adapter'

type SearchMock = ReturnType<typeof vi.fn>

function createCollectionMock(searchImpl: SearchMock) {
  return {
    documents() {
      return {
        search: searchImpl,
      }
    },
  }
}

describe('TypesenseAdapter', () => {
  it('returns typed results mapped from Typesense hits', async () => {
    const longContent = 'A'.repeat(330)
    const search = vi.fn().mockResolvedValue({
      found: 1,
      page: 1,
      hits: [
        {
          text_match: 123,
          document: {
            id: 'doc-1',
            url: 'https://example.com/post',
            title: 'What is Apologetics?',
            content: longContent,
            site_name: 'Example Ministry',
            site_domain: 'example.com',
            category_slugs: ['apologetics'],
          },
        },
      ],
    })

    const adapter = new TypesenseAdapter(createCollectionMock(search))
    const response = await adapter.search('apologetics', { page: 1, limit: 5 })

    expect(response.found).toBe(1)
    expect(response.results[0]).toMatchObject({
      id: 'doc-1',
      title: 'What is Apologetics?',
      siteName: 'Example Ministry',
      siteDomain: 'example.com',
      categorySlugs: ['apologetics'],
      score: 123,
    })
    expect(response.results[0].snippet).toHaveLength(303)
  })

  it('supports facet filters and pagination options', async () => {
    const search = vi.fn().mockResolvedValue({ found: 0, page: 2, hits: [] })
    const adapter = new TypesenseAdapter(createCollectionMock(search))

    await adapter.search('counseling', {
      page: 2,
      limit: 20,
      siteDomains: ['ccef.org'],
      categorySlugs: ['biblical-counseling'],
    })

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        q: 'counseling',
        page: 2,
        per_page: 20,
        filter_by:
          'site_domain:["ccef.org"] && category_slugs:["biblical-counseling"]',
      })
    )
  })

  it('returns empty results for blank queries', async () => {
    const search = vi.fn()
    const adapter = new TypesenseAdapter(createCollectionMock(search))

    const response = await adapter.search('   ')

    expect(response).toEqual({
      query: '',
      page: 1,
      limit: 10,
      found: 0,
      results: [],
    })
    expect(search).not.toHaveBeenCalled()
  })

  it('wraps Typesense failures in SearchAdapterError', async () => {
    const search = vi.fn().mockRejectedValue(new Error('ETIMEDOUT'))
    const adapter = new TypesenseAdapter(createCollectionMock(search))

    await expect(adapter.search('theology')).rejects.toBeInstanceOf(SearchAdapterError)
  })
})
