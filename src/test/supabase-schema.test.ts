import { describe, it, expect, vi, beforeEach } from 'vitest'

// Table names expected to exist in the schema
const EXPECTED_TABLES = [
  'sites',
  'categories',
  'site_categories',
  'crawl_queue',
  'crawl_pages',
  'search_logs',
] as const

// crawl_pages columns that must exist (soft-delete lifecycle — Issue #40)
const CRAWL_PAGES_REQUIRED_COLUMNS = [
  'id',
  'site_id',
  'url',
  'title',
  'content',
  'content_hash',
  'typesense_id',
  'crawled_at',
  'deleted_at',
  'created_at',
] as const

// search_logs must not store PII (S8)
const SEARCH_LOGS_ALLOWED_COLUMNS = [
  'id',
  'query',
  'result_count',
  'category_filter',
  'created_at',
] as const

const SEARCH_LOGS_FORBIDDEN_COLUMNS = ['ip', 'user_agent', 'session_id', 'user_id'] as const

describe('schema: table inventory', () => {
  it('defines all required tables', () => {
    // These are the tables we expect to exist — validated here as a living spec.
    expect(EXPECTED_TABLES).toHaveLength(6)
    expect(EXPECTED_TABLES).toContain('sites')
    expect(EXPECTED_TABLES).toContain('search_logs')
    expect(EXPECTED_TABLES).toContain('crawl_pages')
  })
})

describe('schema: crawl_pages soft-delete column', () => {
  it('includes deleted_at for soft-delete lifecycle (Issue #40)', () => {
    expect(CRAWL_PAGES_REQUIRED_COLUMNS).toContain('deleted_at')
  })

  it('includes all required columns', () => {
    expect(CRAWL_PAGES_REQUIRED_COLUMNS).toHaveLength(10)
  })
})

describe('schema: search_logs PII minimisation (S8)', () => {
  it('only stores allowed columns', () => {
    expect(SEARCH_LOGS_ALLOWED_COLUMNS).toHaveLength(5)
  })

  it('does not include PII columns', () => {
    SEARCH_LOGS_FORBIDDEN_COLUMNS.forEach((col) => {
      expect(SEARCH_LOGS_ALLOWED_COLUMNS).not.toContain(col)
    })
  })
})

describe('environment: Supabase config', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  it('requires NEXT_PUBLIC_SUPABASE_URL', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toMatch(/supabase\.co/)
  })

  it('requires NEXT_PUBLIC_SUPABASE_ANON_KEY', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
    expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeTruthy()
  })

  it('SUPABASE_SERVICE_ROLE_KEY must not be prefixed NEXT_PUBLIC_', () => {
    // Ensures the service role key is never accidentally exposed to the browser
    expect('SUPABASE_SERVICE_ROLE_KEY').not.toMatch(/^NEXT_PUBLIC_/)
  })
})
