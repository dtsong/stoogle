import fs from 'node:fs'
import path from 'node:path'
import { createAdminClient } from '@/lib/supabase/admin'
import { runCrawlForSite } from '@/lib/crawler/run-crawl'

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return

  const contents = fs.readFileSync(envPath, 'utf8')
  for (const line of contents.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf('=')
    if (separator <= 0) continue

    const key = trimmed.slice(0, separator).trim()
    const value = trimmed.slice(separator + 1).trim()

    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

async function main() {
  loadEnvLocal()

  const pageCap = Number(process.env.PHASE0_CRAWL_PAGE_CAP ?? '30')
  const client = createAdminClient()

  const { data: sites, error } = await client
    .from('sites')
    .select('id, url, name, is_active')
    .eq('is_active', true)
    .limit(10)

  if (error || !sites) {
    throw new Error(`Failed to load sites for crawl: ${error?.message ?? 'Unknown error'}`)
  }

  const results = []
  for (const site of sites as Array<{ id: string; url: string }>) {
    const result = await runCrawlForSite(site.id, 'phase0-gate', { pageCap })
    results.push({
      siteId: site.id,
      siteUrl: site.url,
      pagesIndexed: result.pagesIndexed,
      pagesProcessed: result.pagesProcessed,
      errors: result.errors.length,
    })
  }

  console.log(JSON.stringify({
    pageCap,
    totalSites: sites.length,
    results,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
