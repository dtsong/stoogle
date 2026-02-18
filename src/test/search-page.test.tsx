import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import SearchPage from '@/app/search/page'

vi.mock('@/lib/search/search-action', () => ({
  executeSearchAction: vi.fn(async ({ query }) => ({
    ok: true,
    error: null,
    data: {
      query,
      page: 1,
      limit: 10,
      found: 1,
      results: [
        {
          id: 'doc-1',
          url: 'https://example.com/post',
          title: 'Apologetics Basics',
          snippet: 'Apologetics helps believers answer questions.',
          siteName: 'Example Site',
          siteDomain: 'example.com',
          categorySlugs: ['apologetics'],
          score: 22,
        },
      ],
    },
  })),
}))

describe('Search page', () => {
  it('renders count and submitted query text', async () => {
    const component = await SearchPage({ searchParams: Promise.resolve({ query: 'apologetics' }) })
    const { container } = render(component)

    expect(screen.getByRole('heading', { name: /1 results for .*apologetics.*/i })).toBeTruthy()
    expect(screen.getByRole('link', { name: /apologetics basics/i })).toBeTruthy()
    expect(container.querySelectorAll('strong').length).toBeGreaterThan(0)
  })

  it('caps query display to 200 characters and keeps top search bar', async () => {
    const longQuery = 'a'.repeat(220)
    const component = await SearchPage({ searchParams: Promise.resolve({ query: longQuery }) })
    render(component)

    const searchInput = screen.getByRole('searchbox', { name: /search trusted christian resources/i })
    expect(searchInput.getAttribute('maxlength')).toBe('200')
    expect((searchInput as HTMLInputElement).value.length).toBeLessThanOrEqual(200)
  })

  it('normalizes repeated query params to the first value', async () => {
    const component = await SearchPage({
      searchParams: Promise.resolve({ query: ['alpha', 'beta'] }),
    })
    render(component)

    expect(screen.getByRole('heading', { name: 'Results for "alpha"' })).toBeTruthy()
  })
})
