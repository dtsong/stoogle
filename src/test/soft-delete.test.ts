import { describe, it, expect } from 'vitest'
import {
  isActivePage,
  isExpiredSoftDelete,
  ACTIVE_PAGES_FILTER,
  type CrawlPageSoftDelete,
} from '@/lib/crawler/soft-delete'

const activePage: CrawlPageSoftDelete = {
  id: 'page-1',
  site_id: 'site-1',
  deleted_at: null,
}

const recentlyDeleted: CrawlPageSoftDelete = {
  id: 'page-2',
  site_id: 'site-1',
  deleted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
}

const expiredDeleted: CrawlPageSoftDelete = {
  id: 'page-3',
  site_id: 'site-1',
  deleted_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
}

describe('isActivePage', () => {
  it('returns true when deleted_at is null', () => {
    expect(isActivePage(activePage)).toBe(true)
  })

  it('returns false when deleted_at is set', () => {
    expect(isActivePage(recentlyDeleted)).toBe(false)
  })
})

describe('isExpiredSoftDelete', () => {
  it('returns false for active pages', () => {
    expect(isExpiredSoftDelete(activePage)).toBe(false)
  })

  it('returns false for recently soft-deleted pages (within 7 days)', () => {
    expect(isExpiredSoftDelete(recentlyDeleted)).toBe(false)
  })

  it('returns true for pages soft-deleted more than 7 days ago', () => {
    expect(isExpiredSoftDelete(expiredDeleted)).toBe(true)
  })

  it('respects a custom retention window', () => {
    // 2-day-old deletion with 1-day retention → expired
    expect(isExpiredSoftDelete(recentlyDeleted, 1)).toBe(true)
    // 2-day-old deletion with 3-day retention → not expired
    expect(isExpiredSoftDelete(recentlyDeleted, 3)).toBe(false)
  })
})

describe('ACTIVE_PAGES_FILTER', () => {
  it('is the correct Supabase filter for non-deleted pages', () => {
    expect(ACTIVE_PAGES_FILTER).toBe('deleted_at.is.null')
  })
})

// Integration test stubs (require live Supabase connection — run against preview branch)
// TODO(#40): deactivate site → verify crawl_pages.deleted_at set via DB trigger
// TODO(#40): advance time 8 days → verify pg_cron purge removes expired rows
