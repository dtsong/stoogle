import { describe, expect, it, vi } from 'vitest'
import { PHASE1_SEED_DATA, seedPhase1Data, validatePhase1SeedData } from '@/lib/seed/phase1'

describe('phase 1 seed data', () => {
  it('contains 45 sites and 6 categories', () => {
    expect(PHASE1_SEED_DATA.sites).toHaveLength(45)
    expect(PHASE1_SEED_DATA.categories).toHaveLength(6)
  })

  it('has no duplicate URLs or domains and all category mappings are valid', () => {
    expect(() => validatePhase1SeedData(PHASE1_SEED_DATA)).not.toThrow()
  })

  it('rejects duplicate domain hostnames', () => {
    const mutated = {
      ...PHASE1_SEED_DATA,
      sites: PHASE1_SEED_DATA.sites.map((site, index) =>
        index === 0 ? { ...site, url: PHASE1_SEED_DATA.sites[1].url } : site
      ),
    }

    expect(() => validatePhase1SeedData(mutated)).toThrow('Duplicate site URLs')
  })
})

describe('seedPhase1Data', () => {
  it('upserts categories, sites, and site_categories', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    const select = vi
      .fn()
      .mockResolvedValueOnce({
        data: PHASE1_SEED_DATA.categories.map((category, index) => ({
          id: `category-${index}`,
          slug: category.slug,
        })),
        error: null,
      })
      .mockResolvedValueOnce({
        data: PHASE1_SEED_DATA.sites.map((site, index) => ({
          id: `site-${index}`,
          url: site.url,
        })),
        error: null,
      })

    const from = vi.fn(() => ({ upsert, select }))
    const client = { from }

    await seedPhase1Data(client)

    expect(from).toHaveBeenCalledWith('categories')
    expect(from).toHaveBeenCalledWith('sites')
    expect(from).toHaveBeenCalledWith('site_categories')
    expect(upsert).toHaveBeenCalled()
  })
})
