'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { SearchResponse } from '@/lib/search/types'

type SearchFiltersProps = {
  query: string
  selectedSiteNames: string[]
  selectedCategorySlugs: string[]
  facets: SearchResponse['facets']
}

function buildSearchHref(query: string, siteNames: string[], categorySlugs: string[]) {
  const params = new URLSearchParams()
  if (query) params.set('query', query)
  params.set('page', '1')

  for (const siteName of siteNames) {
    params.append('site', siteName)
  }

  for (const categorySlug of categorySlugs) {
    params.append('category', categorySlug)
  }

  return `/search?${params.toString()}`
}

function FilterChip({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      className="inline-flex min-h-11 items-center rounded-full border border-border bg-background px-3 text-sm text-foreground transition hover:border-primary/40"
    >
      {label}
    </a>
  )
}

function FilterGroup({
  title,
  options,
  selected,
  createHref,
}: {
  title: string
  options: Array<{ value: string; count: number }>
  selected: string[]
  createHref: (next: string[]) => string
}) {
  if (options.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">{title}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isActive = selected.includes(option.value)
          const next = isActive
            ? selected.filter((item) => item !== option.value)
            : [...selected, option.value]

          return (
            <a
              key={option.value}
              href={createHref(next)}
              className={[
                'inline-flex min-h-11 items-center rounded-md border px-3 text-sm transition',
                isActive
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground',
              ].join(' ')}
            >
              {option.value} ({option.count})
            </a>
          )
        })}
      </div>
    </div>
  )
}

function FilterPanel({
  query,
  selectedSiteNames,
  selectedCategorySlugs,
  facets,
}: SearchFiltersProps) {
  const hasSelected = selectedSiteNames.length > 0 || selectedCategorySlugs.length > 0

  const chips = useMemo(() => {
    return [
      ...selectedSiteNames.map((siteName) => ({
        label: `Site: ${siteName} x`,
        href: buildSearchHref(
          query,
          selectedSiteNames.filter((value) => value !== siteName),
          selectedCategorySlugs
        ),
      })),
      ...selectedCategorySlugs.map((categorySlug) => ({
        label: `Category: ${categorySlug} x`,
        href: buildSearchHref(
          query,
          selectedSiteNames,
          selectedCategorySlugs.filter((value) => value !== categorySlug)
        ),
      })),
    ]
  }, [query, selectedCategorySlugs, selectedSiteNames])

  return (
    <div className="space-y-4">
      {hasSelected ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            Active Filters
          </p>
          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <FilterChip key={chip.label} label={chip.label} href={chip.href} />
            ))}
          </div>
        </div>
      ) : null}

      <FilterGroup
        title="Source Site"
        options={facets.siteNames}
        selected={selectedSiteNames}
        createHref={(nextSites) => buildSearchHref(query, nextSites, selectedCategorySlugs)}
      />
      <FilterGroup
        title="Category"
        options={facets.categorySlugs}
        selected={selectedCategorySlugs}
        createHref={(nextCategories) => buildSearchHref(query, selectedSiteNames, nextCategories)}
      />
    </div>
  )
}

export function SearchFilters(props: SearchFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <div className="hidden rounded-xl border border-border bg-card p-4 md:block">
        <FilterPanel {...props} />
      </div>

      <div className="md:hidden">
        <Button type="button" variant="outline" className="min-h-11 w-full" onClick={() => setIsOpen(true)}>
          Filter Results
        </Button>
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl border border-border bg-background p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Filters</h2>
              <Button type="button" variant="ghost" className="min-h-11" onClick={() => setIsOpen(false)}>
                Close
              </Button>
            </div>
            <FilterPanel {...props} />
          </div>
        </div>
      ) : null}
    </>
  )
}
