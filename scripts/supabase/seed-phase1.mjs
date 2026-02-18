import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { createClient } from '@supabase/supabase-js'

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return

  const contents = fs.readFileSync(envPath, 'utf8')
  for (const line of contents.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex <= 0) continue

    const key = trimmed.slice(0, separatorIndex).trim()
    const value = trimmed.slice(separatorIndex + 1).trim()

    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

function required(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

async function main() {
  loadEnvLocal()

  const supabaseUrl = required('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = required('SUPABASE_SERVICE_ROLE_KEY')
  const client = createClient(supabaseUrl, serviceRoleKey)

  const seedPath = path.join(process.cwd(), 'supabase/seeds/phase1.seed.json')
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'))

  const { error: categoryUpsertError } = await client.from('categories').upsert(
    seed.categories.map((category) => ({
      name: category.name,
      slug: category.slug,
    })),
    { onConflict: 'slug' }
  )

  if (categoryUpsertError) {
    throw new Error(`Failed to upsert categories: ${categoryUpsertError.message}`)
  }

  const { error: siteUpsertError } = await client.from('sites').upsert(
    seed.sites.map((site) => ({
      url: site.url,
      name: site.name,
      description: site.description,
      is_active: true,
    })),
    { onConflict: 'url' }
  )

  if (siteUpsertError) {
    throw new Error(`Failed to upsert sites: ${siteUpsertError.message}`)
  }

  const { data: categoryRows, error: categorySelectError } = await client
    .from('categories')
    .select('id, slug')
  const { data: siteRows, error: siteSelectError } = await client.from('sites').select('id, url')

  if (categorySelectError) {
    throw new Error(`Failed to read categories: ${categorySelectError.message}`)
  }

  if (siteSelectError) {
    throw new Error(`Failed to read sites: ${siteSelectError.message}`)
  }

  const categoryIdBySlug = new Map((categoryRows ?? []).map((row) => [row.slug, row.id]))
  const siteIdByUrl = new Map((siteRows ?? []).map((row) => [row.url, row.id]))

  const siteCategories = []
  for (const site of seed.sites) {
    const siteId = siteIdByUrl.get(site.url)
    if (!siteId) continue

    for (const slug of site.categories) {
      const categoryId = categoryIdBySlug.get(slug)
      if (!categoryId) continue
      siteCategories.push({ site_id: siteId, category_id: categoryId })
    }
  }

  const { error: mappingError } = await client.from('site_categories').upsert(siteCategories, {
    onConflict: 'site_id,category_id',
  })

  if (mappingError) {
    throw new Error(`Failed to upsert site_categories: ${mappingError.message}`)
  }

  console.log('Seeded phase 1 data (50 sites, 6 categories) successfully.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
