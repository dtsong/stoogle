import { TypesenseSearchIndex } from '@/lib/crawler/index'
import { runSiteCrawl } from '@/lib/crawler/pipeline'
import { SupabaseCrawlRepository } from '@/lib/crawler/repository'

export async function runCrawlForSite(siteId: string, triggeredBy = 'manual') {
  const repository = new SupabaseCrawlRepository()
  const index = new TypesenseSearchIndex()

  return runSiteCrawl(
    {
      siteId,
      triggeredBy,
    },
    {
      repository,
      index,
    }
  )
}
