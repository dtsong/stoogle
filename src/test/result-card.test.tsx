import { render, screen } from '@testing-library/react'
import { ResultCard, RESULT_SNIPPET_MAX_LENGTH, truncateSnippet } from '@/components/search/result-card'
import type { SearchResult } from '@/lib/search/types'

const baseResult: SearchResult = {
  id: 'doc-1',
  url: 'https://example.com/post',
  title: 'Apologetics Basics',
  snippet: 'Apologetics helps believers answer hard questions with clarity.',
  siteName: 'Example Site',
  siteDomain: 'example.com',
  categorySlugs: ['apologetics'],
  score: 22,
}

describe('ResultCard', () => {
  it('renders all expected fields and report flag', () => {
    render(<ResultCard result={baseResult} query="apologetics" />)

    expect(screen.getByRole('link', { name: /apologetics basics/i })).toBeTruthy()
    expect(screen.getByText(/example site - https:\/\/example.com\/post/i)).toBeTruthy()
    expect(screen.getByText(/helps believers answer hard questions/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /report result/i })).toBeTruthy()
  })

  it('highlights matching query tokens and keeps content text-only', () => {
    render(
      <ResultCard
        result={{
          ...baseResult,
          snippet: '<script>alert(1)</script> Apologetics and doctrine',
        }}
        query="apologetics"
      />
    )

    expect(screen.getByText('<script>alert(1)</script>', { exact: false })).toBeTruthy()
    expect(screen.getAllByText('Apologetics', { selector: 'strong' }).length).toBeGreaterThan(0)
    expect(document.querySelector('script')).toBeNull()
  })

  it('truncates snippets to 300 characters max', () => {
    const longSnippet = 'a'.repeat(RESULT_SNIPPET_MAX_LENGTH + 50)
    const truncated = truncateSnippet(longSnippet)

    expect(truncated.length).toBe(RESULT_SNIPPET_MAX_LENGTH)
    expect(truncated.endsWith('...')).toBe(true)
  })
})
