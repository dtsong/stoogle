/**
 * Soft-delete helpers for crawl_pages lifecycle (Issue #40).
 *
 * Decision: deleted_at timestamp marks pages for removal.
 * - Site deactivation → DB trigger sets deleted_at = NOW() on all site pages.
 * - Typesense indexing pipeline uses ACTIVE_PAGES_FILTER to skip soft-deleted rows.
 * - pg_cron hard-deletes rows where deleted_at > 7 days (migration 003).
 */

/** Supabase filter string: only index pages that are not soft-deleted. */
export const ACTIVE_PAGES_FILTER = 'deleted_at.is.null'

/** Type representing a crawl_pages row with soft-delete fields. */
export type CrawlPageSoftDelete = {
  id: string
  site_id: string
  deleted_at: string | null
}

/**
 * Returns true if a crawl_pages row is active (not soft-deleted).
 * Used by the Typesense indexing pipeline to filter in-memory results.
 */
export function isActivePage(page: CrawlPageSoftDelete): boolean {
  return page.deleted_at === null
}

/**
 * Returns true if a soft-deleted page is eligible for hard-deletion
 * (deleted_at older than the retention window).
 */
export function isExpiredSoftDelete(
  page: CrawlPageSoftDelete,
  retentionDays = 7
): boolean {
  if (page.deleted_at === null) return false
  const deletedAt = new Date(page.deleted_at)
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)
  return deletedAt < cutoff
}
