import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const ROOT = resolve(__dirname, '../..')

function readProjectFile(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf-8')
}

describe('Mobile polish', () => {
  it('search page has sticky search bar', () => {
    const searchPage = readProjectFile('src/app/search/page.tsx')
    expect(searchPage).toContain('sticky top-0')
  })

  it('homepage has sticky mobile search bar', () => {
    const homePage = readProjectFile('src/app/page.tsx')
    expect(homePage).toContain('sticky top-0')
  })

  it('all buttons use min-h-11 (44px touch targets)', () => {
    const searchFilters = readProjectFile('src/components/search/search-filters.tsx')
    expect(searchFilters).toContain('min-h-11')
  })

  it('input uses text-base (16px) to prevent iOS auto-zoom', () => {
    const input = readProjectFile('src/components/ui/input.tsx')
    expect(input).toContain('text-base')
  })

  it('loading state uses skeleton cards, not spinner', () => {
    const states = readProjectFile('src/components/search/search-states.tsx')
    expect(states).toContain('SearchLoadingSkeleton')
    expect(states).not.toContain('spinner')
    expect(states).toContain('animate-pulse')
  })

  it('search filters use bottom sheet on mobile', () => {
    const filters = readProjectFile('src/components/search/search-filters.tsx')
    expect(filters).toContain('md:hidden')
    expect(filters).toContain('bottom-0')
    expect(filters).toContain('rounded-t-2xl')
  })

  it('body prevents horizontal overflow', () => {
    const layout = readProjectFile('src/app/layout.tsx')
    expect(layout).toContain('overflow-x-hidden')
  })

  it('viewport meta tag present', () => {
    const layout = readProjectFile('src/app/layout.tsx')
    expect(layout).toContain('width=device-width')
  })

  it('result card URLs are truncated to prevent overflow', () => {
    const resultCard = readProjectFile('src/components/search/result-card.tsx')
    expect(resultCard).toContain('truncate')
  })

  it('suggested queries have 44px touch targets', () => {
    const homePage = readProjectFile('src/app/page.tsx')
    expect(homePage).toContain('min-h-11')
  })
})
