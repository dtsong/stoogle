import fs from 'node:fs'
import path from 'node:path'
import { createAdminClient } from '@/lib/supabase/admin'
import { runCrawlForSite } from '@/lib/crawler/run-crawl'
import { PHASE1_SEED_DATA } from '@/lib/seed/phase1'
import type { CrawlEvent } from '@/lib/crawler/events'

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

type SiteProgress = {
  name: string
  page: number
  total: number
}

function renderProgress(
  completed: number,
  total: number,
  startedAtMs: number,
  activeProgress: Map<string, SiteProgress>
) {
  const width = 28
  const ratio = total === 0 ? 0 : completed / total
  const filled = Math.round(ratio * width)
  const bar = `${'='.repeat(filled)}${'-'.repeat(Math.max(0, width - filled))}`

  const elapsedSec = Math.max(1, Math.floor((Date.now() - startedAtMs) / 1000))
  const rate = completed / elapsedSec
  const remaining = Math.max(0, total - completed)
  const etaSec = rate > 0 ? Math.ceil(remaining / rate) : 0

  let line = `\r[${bar}] ${completed}/${total} (${Math.round(ratio * 100)}%) elapsed ${elapsedSec}s ETA ~${etaSec}s`

  const activeSites: string[] = []
  for (const progress of activeProgress.values()) {
    activeSites.push(`${progress.name} ${progress.page}/${progress.total}`)
  }
  if (activeSites.length > 0) {
    line += `\n  active: ${activeSites.join(' | ')}`
  }

  // Clear previous lines and write new content
  process.stdout.write(`\x1b[2K\x1b[1A\x1b[2K\r${line}`)

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

async function withAbortableTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  label: string,
  externalController?: AbortController
): Promise<T> {
  const controller = externalController ?? new AbortController()
  let timeoutId: NodeJS.Timeout | undefined

  try {
    return await Promise.race([
      fn(controller.signal),
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          controller.abort(new Error(`${label} timed out after ${timeoutMs}ms`))
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

async function getCompletedSiteIds(
  client: ReturnType<typeof createAdminClient>,
  phase1SiteIds: string[],
  resumeWindowMs: number
): Promise<Set<string>> {
  const cutoff = new Date(Date.now() - resumeWindowMs).toISOString()

  // Find completed crawl jobs within the resume window
  const { data: completedJobs } = await client
    .from('crawl_queue')
    .select('site_id')
    .in('site_id', phase1SiteIds)
    .eq('status', 'completed')
    .gte('attempted_at', cutoff)

  // Reset stuck processing entries older than the resume window
  await client
    .from('crawl_queue')
    .update({ status: 'pending' })
    .in('site_id', phase1SiteIds)
    .eq('status', 'processing')
    .lt('attempted_at', cutoff)

  return new Set((completedJobs ?? []).map((row) => row.site_id))
}

async function main() {
  loadEnvLocal()

  const pageCap = parsePositiveIntegerEnv('PHASE1_CRAWL_PAGE_CAP', 10)
  const concurrency = parsePositiveIntegerEnv('PHASE1_CRAWL_CONCURRENCY', 5)
  const siteTimeoutMs = parsePositiveIntegerEnv('PHASE1_CRAWL_SITE_TIMEOUT_MS', 180000)
  const resumeWindowMs = parsePositiveIntegerEnv('PHASE1_CRAWL_RESUME_WINDOW_MS', 86400000)
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

  const allSites = phase1SeedUrls.map((url) => ({
    id: siteIdByUrl.get(url)!,
    url,
  }))

  if (allSites.length === 0) {
    throw new Error('Failed to load active phase1 sites for crawl: no sites returned')
  }

  // Checkpoint/resume: skip recently completed sites
  const allSiteIds = allSites.map((s) => s.id)
  const completedSiteIds = await getCompletedSiteIds(client, allSiteIds, resumeWindowMs)
  const sites = allSites.filter((s) => !completedSiteIds.has(s.id))
  const skippedSites = allSites.length - sites.length

  if (skippedSites > 0) {
    console.log(`Resuming: skipping ${skippedSites} recently completed sites`)
  }

  // Graceful shutdown
  let shuttingDown = false
  let forceShutdown = false
  let graceTimerId: NodeJS.Timeout | undefined
  const activeControllers = new Map<string, AbortController>()

  function handleShutdownSignal() {
    if (shuttingDown) {
      console.log('\nForce shutdown requested — exiting immediately')
      forceShutdown = true
      // Abort all active crawls immediately
      for (const controller of activeControllers.values()) {
        controller.abort(new Error('Force shutdown'))
      }
      return
    }

    shuttingDown = true
    console.log('\nGraceful shutdown requested — finishing active sites (30s grace period)...')
    // Don't abort active crawls — let them finish within grace period
    graceTimerId = setTimeout(() => {
      if (!forceShutdown) {
        console.log('\nGrace period expired — aborting remaining crawls')
        for (const controller of activeControllers.values()) {
          controller.abort(new Error('Grace period expired'))
        }
      }
    }, 30000)
  }

  process.on('SIGINT', handleShutdownSignal)
  process.on('SIGTERM', handleShutdownSignal)

  // Rich progress tracking
  const activeProgress = new Map<string, SiteProgress>()
  const siteNameById = new Map<string, string>()
  for (const seed of PHASE1_SEED_DATA.sites) {
    const id = siteIdByUrl.get(seed.url)
    if (id) siteNameById.set(id, seed.name)
  }

  function handleCrawlEvent(siteId: string, event: CrawlEvent) {
    if (event.type === 'site-start') {
      activeProgress.set(siteId, { name: event.name, page: 0, total: 0 })
    } else if (event.type === 'discovery-complete') {
      const progress = activeProgress.get(siteId)
      if (progress) progress.total = event.urlCount
    } else if (event.type === 'page-processed') {
      const progress = activeProgress.get(siteId)
      if (progress) progress.page = event.pageIndex
    } else if (event.type === 'site-complete') {
      activeProgress.delete(siteId)
    }
  }

  const results = []
  const startedAtMs = Date.now()
  let completed = 0

  console.log(
    `Starting crawl for ${sites.length} sites (concurrency=${concurrency}, pageCap=${pageCap}, siteTimeoutMs=${siteTimeoutMs})`
  )
  // Initial blank line for progress rendering
  process.stdout.write('\n')
  renderProgress(0, sites.length, startedAtMs, activeProgress)

  for (let index = 0; index < sites.length; index += concurrency) {
    if (shuttingDown) break

    const chunk = sites.slice(index, index + concurrency)
    const chunkResults = await Promise.all(
      chunk.map(async (site) => {
        const controller = new AbortController()
        activeControllers.set(site.id, controller)

        try {
          const result = await withAbortableTimeout(
            (signal) =>
              runCrawlForSite(site.id, 'phase1-seed-crawl', {
                pageCap,
                signal,
                onEvent: (event) => handleCrawlEvent(site.id, event),
              }),
            siteTimeoutMs,
            `Crawl for ${site.url}`,
            controller
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
          activeControllers.delete(site.id)
          activeProgress.delete(site.id)
          completed += 1
          renderProgress(completed, sites.length, startedAtMs, activeProgress)
        }
      })
    )

    results.push(...chunkResults)
  }

  // Clean up any stuck processing entries for phase1 sites
  await client
    .from('crawl_queue')
    .update({ status: 'pending' })
    .in('site_id', allSiteIds)
    .eq('status', 'processing')

  // Clean up shutdown resources
  if (graceTimerId) clearTimeout(graceTimerId)
  process.removeListener('SIGINT', handleShutdownSignal)
  process.removeListener('SIGTERM', handleShutdownSignal)

  console.log(
    JSON.stringify(
      {
        pageCap,
        concurrency,
        siteTimeoutMs,
        totalSites: allSites.length,
        skippedSites,
        completedSites: results.filter((r) => !r.failed).length,
        failedSites: results.filter((result) => result.failed).length,
        shuttingDown,
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
