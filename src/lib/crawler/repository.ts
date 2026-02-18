/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAdminClient } from '@/lib/supabase/admin'
import type { CrawlPageRecord, CrawlRepository, CrawlSite } from '@/lib/crawler/pipeline'

export class SupabaseCrawlRepository implements CrawlRepository {
  private readonly client = createAdminClient()

  async createCrawlJob(input: { siteId: string; triggeredBy: string }): Promise<string> {
    const site = await this.findSiteById(input.siteId)
    const url = site?.url ?? 'about:blank'
    const client: any = this.client

    const { data, error } = await client
      .from('crawl_queue')
      .insert({
        site_id: input.siteId,
        url,
        status: 'pending',
        priority: 0,
      })
      .select('id')
      .single()

    if (error || !data) {
      throw new Error(`Failed to create crawl job: ${error?.message ?? 'Unknown error'}`)
    }

    return data.id
  }

  async updateCrawlJob(
    jobId: string,
    input: {
      status: 'pending' | 'processing' | 'completed' | 'failed'
      pagesIndexed?: number
      errorMessage?: string | null
      startedAt?: string
      completedAt?: string
    }
  ): Promise<void> {
    const client: any = this.client
    const { error } = await client
      .from('crawl_queue')
      .update({
        status: input.status,
        attempted_at: input.startedAt ?? input.completedAt ?? new Date().toISOString(),
        error: input.errorMessage ?? null,
      })
      .eq('id', jobId)

    if (error) {
      throw new Error(`Failed to update crawl job: ${error.message}`)
    }
  }

  async findSiteById(siteId: string): Promise<CrawlSite | null> {
    const client: any = this.client
    const { data, error } = await client
      .from('sites')
      .select('id, url, name, is_active')
      .eq('id', siteId)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to load site: ${error.message}`)
    }

    if (!data) {
      return null
    }

    const { data: categoryRows, error: categoryError } = await client
      .from('site_categories')
      .select('categories(slug)')
      .eq('site_id', siteId)

    if (categoryError) {
      throw new Error(`Failed to load site categories: ${categoryError.message}`)
    }

    const categorySlugs = (categoryRows ?? [])
      .map((row: any) => (row.categories as { slug?: string } | null)?.slug)
      .filter((slug: any): slug is string => Boolean(slug))

    return {
      id: data.id,
      url: data.url,
      name: data.name,
      isActive: data.is_active,
      categorySlugs,
    }
  }

  async findPage(siteId: string, url: string): Promise<CrawlPageRecord | null> {
    const client: any = this.client
    const { data, error } = await client
      .from('crawl_pages')
      .select('site_id, url, title, content_hash, typesense_id, deleted_at')
      .eq('site_id', siteId)
      .eq('url', url)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to load page: ${error.message}`)
    }

    if (!data) {
      return null
    }

    return {
      siteId: data.site_id,
      url: data.url,
      title: data.title,
      contentHash: data.content_hash,
      typesenseId: data.typesense_id,
      deletedAt: data.deleted_at,
    }
  }

  async upsertPage(input: {
    siteId: string
    url: string
    title: string | null
    contentHash: string
    typesenseId: string | null
    crawledAt: string
    deletedAt: string | null
  }): Promise<void> {
    const client: any = this.client
    const { error } = await client.from('crawl_pages').upsert(
      {
        site_id: input.siteId,
        url: input.url,
        title: input.title,
        content_hash: input.contentHash,
        typesense_id: input.typesenseId,
        crawled_at: input.crawledAt,
        deleted_at: input.deletedAt,
      },
      {
        onConflict: 'site_id,url',
      }
    )

    if (error) {
      throw new Error(`Failed to upsert crawl page: ${error.message}`)
    }
  }

  async touchPage(input: {
    siteId: string
    url: string
    crawledAt: string
    contentHash: string
  }): Promise<void> {
    const client: any = this.client
    const { error } = await client
      .from('crawl_pages')
      .update({
        crawled_at: input.crawledAt,
        content_hash: input.contentHash,
      })
      .eq('site_id', input.siteId)
      .eq('url', input.url)

    if (error) {
      throw new Error(`Failed to touch crawl page: ${error.message}`)
    }
  }

  async softDeletePagesForSite(siteId: string, deletedAt: string): Promise<void> {
    const client: any = this.client
    const { error } = await client
      .from('crawl_pages')
      .update({ deleted_at: deletedAt })
      .eq('site_id', siteId)
      .is('deleted_at', null)

    if (error) {
      throw new Error(`Failed to soft-delete crawl pages: ${error.message}`)
    }
  }
}
