import { describe, expect, it } from 'vitest'
import { TYPESENSE_PAGES_COLLECTION } from '@/lib/typesense/schema'

describe('typesense pages collection schema', () => {
  it('defines expected collection name', () => {
    expect(TYPESENSE_PAGES_COLLECTION.name).toBe('pages')
  })

  it('defines required fields', () => {
    const fieldNames = TYPESENSE_PAGES_COLLECTION.fields.map((field) => field.name)

    expect(fieldNames).toEqual(
      expect.arrayContaining([
        'id',
        'url',
        'title',
        'content',
        'site_name',
        'site_domain',
        'category_slugs',
        'site_weight',
      ])
    )
  })

  it('marks expected facets', () => {
    const facets = TYPESENSE_PAGES_COLLECTION.fields.filter((field) => field.facet).map((field) => field.name)
    expect(facets).toEqual(expect.arrayContaining(['site_name', 'site_domain', 'category_slugs']))
  })
})
