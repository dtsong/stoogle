import { describe, expect, it, vi } from 'vitest'
import type { CrawlPageRecord, CrawlRepository, CrawlSite, SearchIndex } from '@/lib/crawler/pipeline'
import { runSiteCrawl } from '@/lib/crawler/pipeline'

class InMemoryRepository implements CrawlRepository {
  sites = new Map<string, CrawlSite>()
  pages = new Map<string, CrawlPageRecord>()
  crawlJobs = new Map<string, { status: string; pagesIndexed?: number; errorMessage?: string | null }>()
  softDeleteCalls: Array<{ siteId: string; deletedAt: string }> = []

  private pageKey(siteId: string, url: string) {
    return `${siteId}:${url}`
  }

  async createCrawlJob(input: { siteId: string }): Promise<string> {
    const id = `job-${input.siteId}`
    this.crawlJobs.set(id, { status: 'pending' })
    return id
  }

  async updateCrawlJob(
    jobId: string,
    input: {
      status: 'pending' | 'processing' | 'completed' | 'failed'
      pagesIndexed?: number
      errorMessage?: string | null
    }
  ): Promise<void> {
    this.crawlJobs.set(jobId, {
      status: input.status,
      pagesIndexed: input.pagesIndexed,
      errorMessage: input.errorMessage,
    })
  }

  async findSiteById(siteId: string): Promise<CrawlSite | null> {
    return this.sites.get(siteId) ?? null
  }

  async findPage(siteId: string, url: string): Promise<CrawlPageRecord | null> {
    return this.pages.get(this.pageKey(siteId, url)) ?? null
  }

  async upsertPage(input: {
    siteId: string
    url: string
    title: string | null
    contentHash: string
    typesenseId: string | null
    deletedAt: string | null
  }): Promise<void> {
    this.pages.set(this.pageKey(input.siteId, input.url), {
      siteId: input.siteId,
      url: input.url,
      title: input.title,
      contentHash: input.contentHash,
      typesenseId: input.typesenseId,
      deletedAt: input.deletedAt,
    })
  }

  async touchPage(input: {
    siteId: string
    url: string
    contentHash: string
  }): Promise<void> {
    const existing = await this.findPage(input.siteId, input.url)
    this.pages.set(this.pageKey(input.siteId, input.url), {
      siteId: input.siteId,
      url: input.url,
      title: existing?.title ?? null,
      contentHash: input.contentHash,
      typesenseId: existing?.typesenseId ?? null,
      deletedAt: existing?.deletedAt ?? null,
    })
  }

  async softDeletePagesForSite(siteId: string, deletedAt: string): Promise<void> {
    this.softDeleteCalls.push({ siteId, deletedAt })

    for (const [key, page] of this.pages.entries()) {
      if (page.siteId !== siteId) continue
      this.pages.set(key, { ...page, deletedAt })
    }
  }
}

class InMemoryIndex implements SearchIndex {
  upserts: string[] = []
  removalsById: string[] = []
  removalsByDomain: string[] = []

  async upsert(document: { id: string }): Promise<void> {
    this.upserts.push(document.id)
  }

  async removeById(documentId: string): Promise<void> {
    this.removalsById.push(documentId)
  }

  async removeBySiteDomain(siteDomain: string): Promise<void> {
    this.removalsByDomain.push(siteDomain)
  }
}

describe('runSiteCrawl', () => {
  it('runs discover -> extract -> hash -> upsert flow', async () => {
    const repository = new InMemoryRepository()
    const index = new InMemoryIndex()

    repository.sites.set('site-1', {
      id: 'site-1',
      url: 'https://example.com',
      name: 'Example',
      isActive: true,
      categorySlugs: ['apologetics'],
    })

    const discover = vi.fn().mockResolvedValue({
      urls: ['https://example.com/a', 'https://example.com/b'],
      usedSitemap: true,
      usedBfs: false,
    })

    const extract = vi
      .fn()
      .mockResolvedValueOnce({
        title: 'A',
        content: 'Hello world',
        noindex: false,
        nosnippet: false,
      })
      .mockResolvedValueOnce({
        title: 'B',
        content: 'Other content',
        noindex: false,
        nosnippet: false,
      })

    const result = await runSiteCrawl(
      { siteId: 'site-1', triggeredBy: 'manual' },
      {
        repository,
        index,
        discover,
        extract,
        now: () => new Date('2026-02-18T12:00:00.000Z'),
      }
    )

    expect(result.pagesIndexed).toBe(2)
    expect(result.pagesProcessed).toBe(2)
    expect(index.upserts).toHaveLength(2)
    expect(repository.crawlJobs.get('job-site-1')?.status).toBe('completed')
  })

  it('skips noindex pages and continues after page-level errors', async () => {
    const repository = new InMemoryRepository()
    const index = new InMemoryIndex()

    repository.sites.set('site-1', {
      id: 'site-1',
      url: 'https://example.com',
      name: 'Example',
      isActive: true,
      categorySlugs: ['general'],
    })

    const discover = vi.fn().mockResolvedValue({
      urls: ['https://example.com/noindex', 'https://example.com/error', 'https://example.com/ok'],
      usedSitemap: true,
      usedBfs: false,
    })

    const extract = vi
      .fn()
      .mockResolvedValueOnce({
        title: 'Noindex',
        content: 'Skip me',
        noindex: true,
        nosnippet: false,
      })
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValueOnce({
        title: 'OK',
        content: 'Index me',
        noindex: false,
        nosnippet: false,
      })

    const result = await runSiteCrawl(
      { siteId: 'site-1' },
      {
        repository,
        index,
        discover,
        extract,
      }
    )

    expect(result.pagesIndexed).toBe(1)
    expect(result.errors).toHaveLength(1)
    expect(index.upserts).toHaveLength(1)
  })

  it('soft-deletes pages and removes index docs when site is inactive', async () => {
    const repository = new InMemoryRepository()
    const index = new InMemoryIndex()

    repository.sites.set('site-2', {
      id: 'site-2',
      url: 'https://inactive.com',
      name: 'Inactive Site',
      isActive: false,
      categorySlugs: [],
    })

    const result = await runSiteCrawl(
      { siteId: 'site-2' },
      {
        repository,
        index,
      }
    )

    expect(result.pagesIndexed).toBe(0)
    expect(repository.softDeleteCalls).toHaveLength(1)
    expect(index.removalsByDomain).toEqual(['inactive.com'])
  })

  it('marks crawl failed when site lookup throws', async () => {
    const repository = new InMemoryRepository()
    const index = new InMemoryIndex()

    await expect(
      runSiteCrawl(
        { siteId: 'missing-site' },
        {
          repository,
          index,
        }
      )
    ).rejects.toThrow('Site not found')

    expect(repository.crawlJobs.get('job-missing-site')?.status).toBe('failed')
  })

  it('removes existing index doc when extraction returns null (404/410 path)', async () => {
    const repository = new InMemoryRepository()
    const index = new InMemoryIndex()

    repository.sites.set('site-3', {
      id: 'site-3',
      url: 'https://example.com',
      name: 'Example',
      isActive: true,
      categorySlugs: [],
    })

    await repository.upsertPage({
      siteId: 'site-3',
      url: 'https://example.com/deleted',
      title: 'Old',
      contentHash: 'abc',
      typesenseId: 'site-3:https://example.com/deleted',
      deletedAt: null,
    })

    const discover = vi.fn().mockResolvedValue({
      urls: ['https://example.com/deleted'],
      usedSitemap: true,
      usedBfs: false,
    })
    const extract = vi.fn().mockResolvedValue(null)

    await runSiteCrawl(
      { siteId: 'site-3' },
      {
        repository,
        index,
        discover,
        extract,
      }
    )

    expect(index.removalsById).toEqual(['site-3:https://example.com/deleted'])
  })
})
