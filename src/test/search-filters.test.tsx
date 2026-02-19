import { fireEvent, render, screen } from '@testing-library/react'
import { SearchFilters } from '@/components/search/search-filters'

describe('SearchFilters', () => {
  it('renders active filter chips and facet values', () => {
    render(
      <SearchFilters
        query="apologetics"
        selectedSiteNames={['Example Site']}
        selectedCategorySlugs={['apologetics']}
        facets={{
          siteNames: [{ value: 'Example Site', count: 3 }],
          categorySlugs: [{ value: 'apologetics', count: 4 }],
        }}
      />
    )

    expect(screen.getByText('Active Filters')).toBeTruthy()
    expect(screen.getByText('Site: Example Site x')).toBeTruthy()
    expect(screen.getByText('Category: apologetics x')).toBeTruthy()
    expect(screen.getByText('Example Site (3)')).toBeTruthy()
    expect(screen.getByText('apologetics (4)')).toBeTruthy()
  })

  it('opens mobile filter sheet from the filter button', () => {
    render(
      <SearchFilters
        query="apologetics"
        selectedSiteNames={[]}
        selectedCategorySlugs={[]}
        facets={{
          siteNames: [{ value: 'Example Site', count: 1 }],
          categorySlugs: [{ value: 'apologetics', count: 1 }],
        }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /filter results/i }))
    expect(screen.getByRole('dialog')).toBeTruthy()
  })
})
