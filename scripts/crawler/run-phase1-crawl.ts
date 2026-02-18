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

function renderProgress(completed: number, total: number, startedAtMs: number) {
  const width = 28
  const ratio = total === 0 ? 0 : completed / total
  const filled = Math.round(ratio * width)
  const bar = `${'='.repeat(filled)}${'-'.repeat(Math.max(0, width - filled))}`

  const elapsedSec = Math.max(1, Math.floor((Date.now() - startedAtMs) / 1000))
  const rate = completed / elapsedSec
  const remaining = Math.max(0, total - completed)
  const etaSec = rate > 0 ? Math.ceil(remaining / rate) : 0

  process.stdout.write(
    `\r[${bar}] ${completed}/${total} (${Math.round(ratio * 100)}%) elapsed ${elapsedSec}s ETA ~${etaSec}s`
  )

  if (completed === total) {
    process.stdout.write('\n')
  }
}

async function main() {
  loadEnvLocal()

  const pageCap = Number(process.env.PHASE1_CRAWL_PAGE_CAP ?? '10')
  const client = createAdminClient()

  const sites: Array<{ id: string; url: string }> = []
  const pageSize = 10
  let offset = 0

  while (sites.length < 50) {
    const { data, error } = await client
      .from('sites')
      .select('id, url, name, is_active')
      .eq('is_active', true)
      .range(offset, offset + pageSize - 1)

    if (error) {
      throw new Error(`Failed to load sites for crawl: ${error.message}`)
    }

    if (!data || data.length === 0) {
      break
    }

    for (const site of data as Array<{ id: string; url: string }>) {
      sites.push(site)
      if (sites.length === 50) break
    }

    offset += pageSize
  }

  if (sites.length === 0) {
    throw new Error('Failed to load active sites for crawl: no sites returned')
  }

  const results = []
  const concurrency = Number(process.env.PHASE1_CRAWL_CONCURRENCY ?? '5')
  const startedAtMs = Date.now()
  let completed = 0

  console.log(`Starting crawl for ${sites.length} sites (concurrency=${concurrency}, pageCap=${pageCap})`)
  renderProgress(0, sites.length, startedAtMs)

  for (let index = 0; index < sites.length; index += concurrency) {
    const chunk = sites.slice(index, index + concurrency)
    const chunkResults = await Promise.all(
      chunk.map(async (site) => {
        try {
          const result = await runCrawlForSite(site.id, 'phase1-seed-crawl', { pageCap })
          return {
            siteId: site.id,
            siteUrl: site.url,
            pagesIndexed: result.pagesIndexed,
            pagesProcessed: result.pagesProcessed,
            errors: result.errors.length,
            failed: false,
          }
        } catch (error) {
          return {
            siteId: site.id,
            siteUrl: site.url,
            pagesIndexed: 0,
            pagesProcessed: 0,
            errors: 1,
            failed: true,
            errorMessage: error instanceof Error ? error.message : 'Unknown crawl error',
          }
        } finally {
          completed += 1
          renderProgress(completed, sites.length, startedAtMs)
        }
      })
    )

    results.push(...chunkResults)
  }

  console.log(
    JSON.stringify(
      {
        pageCap,
        concurrency,
        totalSites: sites.length,
        failedSites: results.filter((result) => result.failed).length,
        results,
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
