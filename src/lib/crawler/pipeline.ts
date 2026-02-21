import { discoverPages } from '@/lib/crawler/discovery'
import { fetchAndExtractPage } from '@/lib/crawler/extraction'
import { buildCrawlPageUpdate, shouldRemoveFromIndex } from '@/lib/crawler/hashing'
import type { CrawlEventCallback } from '@/lib/crawler/events'

export type CrawlSite = {
  id: string
  url: string
  name: string
  isActive: boolean
  categorySlugs: string[]
}

export type CrawlPageRecord = {
  siteId: string
  url: string
  title: string | null
  contentHash: string | null
  typesenseId: string | null
  deletedAt: string | null
}

export type CrawlQueueStatus = 'pending' | 'processing' | 'completed' | 'failed'

export type CrawlRepository = {
  createCrawlJob(input: { siteId: string; triggeredBy: string }): Promise<string>
  updateCrawlJob(
    jobId: string,
    input: {
      status: CrawlQueueStatus
      pagesIndexed?: number
      errorMessage?: string | null
      startedAt?: string
      completedAt?: string
    }
  ): Promise<void>
  findSiteById(siteId: string): Promise<CrawlSite | null>
  findPage(siteId: string, url: string): Promise<CrawlPageRecord | null>
  upsertPage(input: {
    siteId: string
    url: string
    title: string | null
    contentHash: string
    typesenseId: string | null
    crawledAt: string
    deletedAt: string | null
  }): Promise<void>
  touchPage(input: {
    siteId: string
    url: string
    crawledAt: string
    contentHash: string
  }): Promise<void>
  softDeletePagesForSite(siteId: string, deletedAt: string): Promise<void>
}

export type SearchIndexDocument = {
  id: string
  url: string
  title: string
  content: string
  site_name: string
  site_domain: string
  category_slugs: string[]
  site_weight: number
}

export type SearchIndex = {
  upsert(document: SearchIndexDocument): Promise<void>
  removeById(documentId: string): Promise<void>
  removeBySiteDomain(siteDomain: string): Promise<void>
}

type PipelineDependencies = {
  repository: CrawlRepository
  index: SearchIndex
  discover?: typeof discoverPages
  extract?: typeof fetchAndExtractPage
  now?: () => Date
  onEvent?: CrawlEventCallback
  perfNow?: () => number
}

export type CrawlRunResult = {
  crawlJobId: string
  pagesIndexed: number
  pagesProcessed: number
  errors: Array<{ url: string; error: string }>
}

function defaultNow() {
  return new Date()
}

function buildTypesenseId(siteId: string, url: string): string {
  return `${siteId}:${url}`
}

export async function runSiteCrawl(
  input: {
    siteId: string
    triggeredBy?: string
    pageCap?: number
    signal?: AbortSignal
  },
  deps: PipelineDependencies
): Promise<CrawlRunResult> {
  const discover = deps.discover ?? discoverPages
  const extract = deps.extract ?? fetchAndExtractPage
  const now = deps.now ?? defaultNow
  const emit = deps.onEvent ?? (() => {})
  const perfNow = deps.perfNow ?? (() => performance.now())

  const siteStartTime = perfNow()

  const crawlJobId = await deps.repository.createCrawlJob({
    siteId: input.siteId,
    triggeredBy: input.triggeredBy ?? 'system',
  })

  await deps.repository.updateCrawlJob(crawlJobId, {
    status: 'processing',
    startedAt: now().toISOString(),
  })

  try {
    const site = await deps.repository.findSiteById(input.siteId)
    if (!site) {
      throw new Error(`Site not found: ${input.siteId}`)
    }

    emit({
      type: 'site-start',
      siteId: site.id,
      url: site.url,
      name: site.name,
      crawlJobId,
    })

    if (!site.isActive) {
      const deletedAt = now().toISOString()
      await deps.repository.softDeletePagesForSite(site.id, deletedAt)
      await deps.index.removeBySiteDomain(new URL(site.url).hostname.toLowerCase())

      await deps.repository.updateCrawlJob(crawlJobId, {
        status: 'completed',
        pagesIndexed: 0,
        completedAt: now().toISOString(),
      })

      return {
        crawlJobId,
        pagesIndexed: 0,
        pagesProcessed: 0,
        errors: [],
      }
    }

    if (input.signal?.aborted) {
      throw new Error('Crawl aborted before discovery')
    }

    const discoverStart = perfNow()
    const discovered = await discover({
      siteUrl: site.url,
      allowedDomains: [new URL(site.url).hostname.toLowerCase()],
      pageCap: input.pageCap,
      signal: input.signal,
    })
    emit({
      type: 'discovery-complete',
      urlCount: discovered.urls.length,
      usedSitemap: discovered.usedSitemap,
      usedBfs: discovered.usedBfs,
      durationMs: perfNow() - discoverStart,
    })

    let pagesIndexed = 0
    let pagesProcessed = 0
    const errors: Array<{ url: string; error: string }> = []
    const siteDomain = new URL(site.url).hostname.toLowerCase()
    const totalPages = discovered.urls.length

    for (const pageUrl of discovered.urls) {
      if (input.signal?.aborted) {
        throw new Error('Crawl aborted during page processing')
      }

      pagesProcessed += 1

      try {
        const extractStart = perfNow()
        const extracted = await extract(pageUrl, undefined, input.signal)
        const extractionMs = perfNow() - extractStart
        const crawledAt = now().toISOString()

        emit({
          type: 'page-processed',
          pageUrl,
          pageIndex: pagesProcessed,
          totalPages,
          extractionMs,
        })

        if (!extracted) {
          emit({ type: 'page-skipped', pageUrl, reason: 'extraction-null' })
          const existing = await deps.repository.findPage(site.id, pageUrl)
          if (existing?.typesenseId) {
            await deps.index.removeById(existing.typesenseId)
          }
          continue
        }

        if (extracted.noindex) {
          emit({ type: 'page-skipped', pageUrl, reason: 'noindex' })
          continue
        }

        const existing = await deps.repository.findPage(site.id, pageUrl)
        const pageUpdate = buildCrawlPageUpdate({
          content: extracted.content,
          previousHash: existing?.contentHash,
          nowIso: crawledAt,
          status: 200,
        })

        if (shouldRemoveFromIndex(200)) {
          emit({ type: 'page-skipped', pageUrl, reason: 'removed-from-index' })
          if (existing?.typesenseId) {
            await deps.index.removeById(existing.typesenseId)
          }
          continue
        }

        if (!pageUpdate.shouldUpsert) {
          emit({ type: 'page-skipped', pageUrl, reason: 'unchanged' })
          await deps.repository.touchPage({
            siteId: site.id,
            url: pageUrl,
            crawledAt,
            contentHash: pageUpdate.contentHash,
          })
          continue
        }

        const typesenseId = existing?.typesenseId ?? buildTypesenseId(site.id, pageUrl)

        await deps.index.upsert({
          id: typesenseId,
          url: pageUrl,
          title: extracted.title ?? pageUrl,
          content: extracted.content,
          site_name: site.name,
          site_domain: siteDomain,
          category_slugs: site.categorySlugs,
          site_weight: 0,
        })

        await deps.repository.upsertPage({
          siteId: site.id,
          url: pageUrl,
          title: extracted.title,
          contentHash: pageUpdate.contentHash,
          typesenseId,
          crawledAt,
          deletedAt: null,
        })

        emit({
          type: 'page-indexed',
          pageUrl,
          typesenseId,
          contentChanged: true,
        })

        pagesIndexed += 1
      } catch (error) {
        emit({
          type: 'page-error',
          pageUrl,
          error: error instanceof Error ? error.message : 'Unknown crawl error',
        })
        errors.push({
          url: pageUrl,
          error: error instanceof Error ? error.message : 'Unknown crawl error',
        })
      }
    }

    emit({
      type: 'site-complete',
      pagesProcessed,
      pagesIndexed,
      errorCount: errors.length,
      durationMs: perfNow() - siteStartTime,
    })

    await deps.repository.updateCrawlJob(crawlJobId, {
      status: 'completed',
      pagesIndexed,
      completedAt: now().toISOString(),
      errorMessage: errors.length > 0 ? `${errors.length} page errors` : null,
    })

    return {
      crawlJobId,
      pagesIndexed,
      pagesProcessed,
      errors,
    }
  } catch (error) {
    await deps.repository.updateCrawlJob(crawlJobId, {
      status: 'failed',
      completedAt: now().toISOString(),
      errorMessage: error instanceof Error ? error.message : 'Unknown pipeline error',
    })

    throw error
  }
}
