import fs from 'node:fs'
import path from 'node:path'
import { createAdminClient } from '@/lib/supabase/admin'
import { runCrawlForSite } from '@/lib/crawler/run-crawl'
import { PHASE1_SEED_DATA } from '@/lib/seed/phase1'

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

function parsePositiveIntegerEnv(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) {
    return fallback
  }

  const value = Number(raw)
  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    throw new Error(`Expected ${name} to be a positive integer, got '${raw}'`)
  }

  return value
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`${label} timed out after ${timeoutMs}ms`))
        }, timeoutMs)
      }),
    ])
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}

async function main() {
  loadEnvLocal()

  const pageCap = parsePositiveIntegerEnv('PHASE1_CRAWL_PAGE_CAP', 10)
  const concurrency = parsePositiveIntegerEnv('PHASE1_CRAWL_CONCURRENCY', 5)
  const siteTimeoutMs = parsePositiveIntegerEnv('PHASE1_CRAWL_SITE_TIMEOUT_MS', 180000)
  const client = createAdminClient()

  const phase1SeedUrls = PHASE1_SEED_DATA.sites.map((site) => site.url)
  const { data, error } = await client
    .from('sites')
    .select('id, url')
    .eq('is_active', true)
    .in('url', phase1SeedUrls)

  if (error) {
    throw new Error(`Failed to load phase1 sites for crawl: ${error.message}`)
  }

  const rows = (data ?? []) as Array<{ id: string; url: string }>
  const siteIdByUrl = new Map(rows.map((site) => [site.url, site.id]))

  const missingUrls = phase1SeedUrls.filter((url) => !siteIdByUrl.has(url))
  if (missingUrls.length > 0) {
    throw new Error(
      `Missing active phase1 sites in database (${missingUrls.length}): ${missingUrls.slice(0, 5).join(', ')}`
    )
  }

  const sites = phase1SeedUrls.map((url) => ({
    id: siteIdByUrl.get(url)!,
    url,
  }))

  if (sites.length === 0) {
    throw new Error('Failed to load active phase1 sites for crawl: no sites returned')
  }

  const results = []
  const startedAtMs = Date.now()
  let completed = 0

  console.log(
    `Starting crawl for ${sites.length} sites (concurrency=${concurrency}, pageCap=${pageCap}, siteTimeoutMs=${siteTimeoutMs})`
  )
  renderProgress(0, sites.length, startedAtMs)

  for (let index = 0; index < sites.length; index += concurrency) {
    const chunk = sites.slice(index, index + concurrency)
    const chunkResults = await Promise.all(
      chunk.map(async (site) => {
        try {
          const result = await withTimeout(
            runCrawlForSite(site.id, 'phase1-seed-crawl', { pageCap }),
            siteTimeoutMs,
            `Crawl for ${site.url}`
          )
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
          siteTimeoutMs,
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
