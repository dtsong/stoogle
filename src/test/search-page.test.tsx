import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import SearchPage from '@/app/search/page'

const { executeSearchActionMock } = vi.hoisted(() => ({
  executeSearchActionMock: vi.fn(async ({ query }) => ({
    ok: true,
    error: null,
    data: {
      query,
      page: 1,
      limit: 10,
      found: 1,
      facets: {
        siteNames: [{ value: 'Example Site', count: 1 }],
        categorySlugs: [{ value: 'apologetics', count: 1 }],
      },
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

vi.mock('@/lib/search/search-action', () => ({
  executeSearchAction: executeSearchActionMock,
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

  it('normalizes repeated query params and invalid page values', async () => {
    const component = await SearchPage({
      searchParams: Promise.resolve({ query: ['alpha', 'beta'], page: 'Infinity' }),
    })
    render(component)

    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('alpha')
    expect(screen.getByText('Page 1 of 1')).toBeTruthy()
  })

  it('passes selected facets into search action and renders active filters', async () => {
    executeSearchActionMock.mockClear()

    const component = await SearchPage({
      searchParams: Promise.resolve({
        query: 'apologetics',
        site: ['Example Site'],
        category: ['apologetics'],
      }),
    })
    render(component)

    expect(executeSearchActionMock).toHaveBeenCalledWith({
      query: 'apologetics',
      options: {
        page: 1,
        limit: 10,
        siteNames: ['Example Site'],
        categorySlugs: ['apologetics'],
      },
    })

    expect(screen.getByText('Active Filters')).toBeTruthy()
    expect(screen.getByText('Site: Example Site x')).toBeTruthy()
    expect(screen.getByText('Category: apologetics x')).toBeTruthy()
  })
})
