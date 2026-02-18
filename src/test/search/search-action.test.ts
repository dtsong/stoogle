import { describe, expect, it, vi } from 'vitest'
import { executeSearchAction, SEARCH_QUERY_MAX_LENGTH } from '@/lib/search/search-action'
import type { SearchResponse } from '@/lib/search/types'

function createResponse(query: string, found = 2): SearchResponse {
  return {
    query,
    page: 1,
    limit: 10,
    found,
    results: [
      {
        id: 'doc-1',
        url: 'https://example.com/a',
        title: 'A',
        snippet: 'Example snippet',
        siteName: 'Example',
        siteDomain: 'example.com',
        categorySlugs: ['general-ministry'],
        score: 10,
      },
    ],
  }
}

describe('executeSearchAction', () => {
  it('sanitizes query, caps length to 200, and logs search', async () => {
    const search = vi.fn().mockResolvedValue(createResponse('trimmed query', 4))
    const insert = vi.fn().mockResolvedValue({ error: null })

    const longQuery = `  ${'a'.repeat(250)}  `
    const result = await executeSearchAction(
      {
        query: longQuery,
        options: { categorySlugs: ['apologetics'] },
      },
      {
        adapter: { search },
        logger: {
          from: () => ({ insert }),
        },
      }
    )

    expect(result.ok).toBe(true)
    expect(search).toHaveBeenCalledWith('a'.repeat(SEARCH_QUERY_MAX_LENGTH), {
      categorySlugs: ['apologetics'],
    })
    expect(insert).toHaveBeenCalledWith({
      query: 'a'.repeat(SEARCH_QUERY_MAX_LENGTH),
      result_count: 4,
      category_filter: 'apologetics',
    })
  })

  it('returns user-friendly error on adapter failure', async () => {
    const search = vi.fn().mockRejectedValue(new Error('Typesense timeout'))
    const insert = vi.fn().mockResolvedValue({ error: null })

    const result = await executeSearchAction(
      { query: 'theology' },
      {
        adapter: { search },
        logger: { from: () => ({ insert }) },
      }
    )

    expect(result.ok).toBe(false)
    expect(result.error).toBe('Search is temporarily unavailable. Please try again.')
    expect(insert).not.toHaveBeenCalled()
  })

  it('returns user-friendly error when log insert fails', async () => {
    const search = vi.fn().mockResolvedValue(createResponse('query', 1))
    const insert = vi.fn().mockResolvedValue({ error: { message: 'db unavailable' } })

    const result = await executeSearchAction(
      { query: 'query' },
      {
        adapter: { search },
        logger: { from: () => ({ insert }) },
      }
    )

    expect(result.ok).toBe(false)
    expect(result.error).toBe('Search is temporarily unavailable. Please try again.')
  })

  it('rejects blank query with validation error', async () => {
    const search = vi.fn()
    const insert = vi.fn()

    const result = await executeSearchAction(
      { query: '    ' },
      {
        adapter: { search },
        logger: { from: () => ({ insert }) },
      }
    )

    expect(result.ok).toBe(false)
    expect(result.error).toBe('Please enter a search query.')
    expect(search).not.toHaveBeenCalled()
    expect(insert).not.toHaveBeenCalled()
  })
})
