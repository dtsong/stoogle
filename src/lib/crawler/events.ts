export type CrawlEvent =
  | {
      type: 'site-start'
      siteId: string
      url: string
      name: string
      crawlJobId: string
    }
  | {
      type: 'discovery-complete'
      urlCount: number
      usedSitemap: boolean
      usedBfs: boolean
      durationMs: number
    }
  | {
      type: 'page-processed'
      pageUrl: string
      pageIndex: number
      totalPages: number
      extractionMs: number
    }
  | {
      type: 'page-indexed'
      pageUrl: string
      typesenseId: string
      contentChanged: boolean
    }
  | {
      type: 'page-skipped'
      pageUrl: string
      reason: 'extraction-null' | 'noindex' | 'unchanged' | 'removed-from-index'
    }
  | {
      type: 'page-error'
      pageUrl: string
      error: string
    }
  | {
      type: 'site-complete'
      pagesProcessed: number
      pagesIndexed: number
      errorCount: number
      durationMs: number
    }

export type CrawlEventCallback = (event: CrawlEvent) => void
