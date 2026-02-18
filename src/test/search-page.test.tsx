import { render, screen } from '@testing-library/react'
import SearchPage from '@/app/search/page'

describe('Search page', () => {
  it('renders submitted query text', async () => {
    const component = await SearchPage({ searchParams: Promise.resolve({ query: 'apologetics' }) })
    render(component)

    expect(screen.getByRole('heading', { name: 'Results for "apologetics"' })).toBeTruthy()
  })

  it('caps query display to 200 characters', async () => {
    const longQuery = 'a'.repeat(220)
    const component = await SearchPage({ searchParams: Promise.resolve({ query: longQuery }) })
    render(component)

    const heading = screen.getByRole('heading')
    expect(heading.textContent?.length).toBeLessThanOrEqual(220)
  })

  it('normalizes repeated query params to the first value', async () => {
    const component = await SearchPage({
      searchParams: Promise.resolve({ query: ['alpha', 'beta'] }),
    })
    render(component)

    expect(screen.getByRole('heading', { name: 'Results for "alpha"' })).toBeTruthy()
  })
})
