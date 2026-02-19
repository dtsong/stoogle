import { render, screen } from '@testing-library/react'
import SearchLoadingPage from '@/app/search/loading'
import { SearchEmptyState, SearchErrorState } from '@/components/search/search-states'

describe('Search states', () => {
  it('renders empty and error states with retry action', () => {
    const { rerender } = render(<SearchEmptyState />)
    expect(screen.getByText(/no results found/i)).toBeTruthy()

    rerender(<SearchErrorState retryHref="/search?query=test&page=1" />)
    expect(screen.getByText(/search is temporarily unavailable/i)).toBeTruthy()
    expect(screen.getByRole('link', { name: /retry search/i })).toBeTruthy()
  })

  it('renders loading skeleton without spinner text', () => {
    render(<SearchLoadingPage />)
    expect(screen.queryByText(/loading/i)).toBeNull()
  })
})
