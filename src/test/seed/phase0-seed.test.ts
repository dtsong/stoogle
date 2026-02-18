import { describe, expect, it, vi } from 'vitest'
import { PHASE0_SEED_DATA, seedPhase0Data, validatePhase0SeedData } from '@/lib/seed/phase0'

describe('phase 0 seed data', () => {
  it('contains 10 sites and 6 categories', () => {
    expect(PHASE0_SEED_DATA.sites).toHaveLength(10)
    expect(PHASE0_SEED_DATA.categories).toHaveLength(6)
  })

  it('is valid and internally consistent', () => {
    expect(() => validatePhase0SeedData(PHASE0_SEED_DATA)).not.toThrow()
  })

  it('rejects duplicate site urls', () => {
    const duplicated = {
      ...PHASE0_SEED_DATA,
      sites: [...PHASE0_SEED_DATA.sites, PHASE0_SEED_DATA.sites[0]],
    }

    expect(() => validatePhase0SeedData(duplicated)).toThrow('Expected 10 sites')
  })

  it('rejects unknown category references', () => {
    const invalid = {
      ...PHASE0_SEED_DATA,
      sites: PHASE0_SEED_DATA.sites.map((site, index) =>
        index === 0 ? { ...site, categories: ['unknown-category'] } : site
      ),
    }

    expect(() => validatePhase0SeedData(invalid)).toThrow('unknown category slug')
  })
})

describe('seedPhase0Data', () => {
  it('upserts categories, sites, and site_categories', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    const select = vi
      .fn()
      .mockResolvedValueOnce({
        data: PHASE0_SEED_DATA.categories.map((category, index) => ({
          id: `category-${index}`,
          slug: category.slug,
        })),
        error: null,
      })
      .mockResolvedValueOnce({
        data: PHASE0_SEED_DATA.sites.map((site, index) => ({
          id: `site-${index}`,
          url: site.url,
        })),
        error: null,
      })

    const from = vi.fn((table: string) => {
      if (table === 'categories' || table === 'sites' || table === 'site_categories') {
        return { upsert, select }
      }

      return { upsert, select }
    })

    const client = { from }
    await seedPhase0Data(client)

    expect(upsert).toHaveBeenCalled()
    expect(from).toHaveBeenCalledWith('categories')
    expect(from).toHaveBeenCalledWith('sites')
    expect(from).toHaveBeenCalledWith('site_categories')
  })
})
