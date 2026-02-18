import { render, screen } from '@testing-library/react'
import Home from '@/app/page'

describe('Homepage', () => {
  it('renders centered search experience', () => {
    render(<Home />)

    expect(screen.getByRole('heading', { name: 'Stoogle' })).toBeTruthy()
    const inputs = screen.getAllByRole('searchbox', { name: /search trusted christian resources/i })
    expect(inputs.length).toBeGreaterThanOrEqual(1)

    for (const input of inputs) {
      expect(input.getAttribute('placeholder')).toBe('Search sermons, theology, apologetics...')
      expect(input.getAttribute('maxlength')).toBe('200')
      expect(input.className).toContain('h-11')
      expect(input.className).toContain('text-base')
    }

    expect(screen.getAllByRole('button', { name: 'Search' }).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByTestId('mobile-sticky-search').className).toContain('sticky')
  })

  it('submits query via GET to search route', () => {
    render(<Home />)

    const form = document.querySelector('form')
    expect(form).not.toBeNull()
    expect(form?.getAttribute('action')).toBe('/search')
    expect(form?.getAttribute('method')).toBe('GET')
  })
})
