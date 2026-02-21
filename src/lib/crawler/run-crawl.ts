import { TypesenseSearchIndex } from '@/lib/crawler/index'
import { runSiteCrawl } from '@/lib/crawler/pipeline'
import { SupabaseCrawlRepository } from '@/lib/crawler/repository'
import type { CrawlEventCallback } from '@/lib/crawler/events'

export async function runCrawlForSite(
  siteId: string,
  triggeredBy = 'manual',
  options?: { pageCap?: number; signal?: AbortSignal; onEvent?: CrawlEventCallback }
) {
  const repository = new SupabaseCrawlRepository()
  const index = new TypesenseSearchIndex()

  return runSiteCrawl(
    {
      siteId,
      triggeredBy,
      pageCap: options?.pageCap,
      signal: options?.signal,
    },
    {
      repository,
      index,
      onEvent: options?.onEvent,
    }
  )
}
