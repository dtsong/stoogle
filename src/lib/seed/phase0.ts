import phase0SeedData from '../../../supabase/seeds/phase0.seed.json'

export type Phase0Category = {
  name: string
  slug: string
}

export type Phase0Site = {
  url: string
  name: string
  description: string
  categories: string[]
}

export type Phase0SeedData = {
  categories: Phase0Category[]
  sites: Phase0Site[]
}

export const PHASE0_SEED_DATA = phase0SeedData as Phase0SeedData

export function validatePhase0SeedData(data: Phase0SeedData): void {
  const categorySlugs = new Set(data.categories.map((category) => category.slug))

  if (data.categories.length !== 6) {
    throw new Error(`Expected 6 categories, got ${data.categories.length}`)
  }

  if (data.sites.length !== 10) {
    throw new Error(`Expected 10 sites, got ${data.sites.length}`)
  }

  const uniqueUrls = new Set(data.sites.map((site) => site.url))
  if (uniqueUrls.size !== data.sites.length) {
    throw new Error('Duplicate site URLs found in phase 0 seed data')
  }

  for (const site of data.sites) {
    if (site.categories.length === 0) {
      throw new Error(`Site '${site.url}' has no categories`)
    }

    for (const categorySlug of site.categories) {
      if (!categorySlugs.has(categorySlug)) {
        throw new Error(`Site '${site.url}' references unknown category slug '${categorySlug}'`)
      }
    }
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function seedPhase0Data(client: any, data = PHASE0_SEED_DATA): Promise<void> {
  validatePhase0SeedData(data)

  const { error: categoryError } = await client.from('categories').upsert(
    data.categories.map((category) => ({
      name: category.name,
      slug: category.slug,
    })),
    { onConflict: 'slug' }
  )

  if (categoryError) {
    throw new Error(`Failed to seed categories: ${categoryError.message}`)
  }

  const { error: sitesError } = await client.from('sites').upsert(
    data.sites.map((site) => ({
      url: site.url,
      name: site.name,
      description: site.description,
      is_active: true,
    })),
    { onConflict: 'url' }
  )

  if (sitesError) {
    throw new Error(`Failed to seed sites: ${sitesError.message}`)
  }

  const { data: categoryRows, error: categoryRowsError } = await client
    .from('categories')
    .select('id, slug')

  if (categoryRowsError) {
    throw new Error(`Failed to load seeded categories: ${categoryRowsError.message}`)
  }

  const { data: siteRows, error: siteRowsError } = await client.from('sites').select('id, url')

  if (siteRowsError) {
    throw new Error(`Failed to load seeded sites: ${siteRowsError.message}`)
  }

  const categoryIdBySlug = new Map<string, string>()
  for (const row of categoryRows as Array<{ id: string; slug: string }>) {
    categoryIdBySlug.set(row.slug, row.id)
  }

  const siteIdByUrl = new Map<string, string>()
  for (const row of siteRows as Array<{ id: string; url: string }>) {
    siteIdByUrl.set(row.url, row.id)
  }

  const siteCategoryRows: Array<{ site_id: string; category_id: string }> = []
  for (const site of data.sites) {
    const siteId = siteIdByUrl.get(site.url)
    if (!siteId) continue

    for (const slug of site.categories) {
      const categoryId = categoryIdBySlug.get(slug)
      if (!categoryId) continue

      siteCategoryRows.push({
        site_id: siteId,
        category_id: categoryId,
      })
    }
  }

  const { error: siteCategoriesError } = await client
    .from('site_categories')
    .upsert(siteCategoryRows, { onConflict: 'site_id,category_id' })

  if (siteCategoriesError) {
    throw new Error(`Failed to seed site_categories: ${siteCategoriesError.message}`)
  }
}
