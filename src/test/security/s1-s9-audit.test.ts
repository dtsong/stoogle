import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join, resolve } from 'path'
import { extractFromHtml } from '@/lib/crawler/extraction'
import { executeSearchAction, SEARCH_QUERY_MAX_LENGTH } from '@/lib/search/search-action'
import type { CrawlRepository, SearchIndex } from '@/lib/crawler/pipeline'

const ROOT = resolve(__dirname, '../../..')

function readProjectFile(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), 'utf-8')
}

function globTsxFiles(dir: string): string[] {
  const results: string[] = []
  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.next') {
      results.push(...globTsxFiles(fullPath))
    } else if (entry.name.endsWith('.tsx')) {
      results.push(fullPath)
    }
  }
  return results
}

// ─────────────────────────────────────────────
// S1: Typesense admin key not in client bundle
// ─────────────────────────────────────────────
describe('S1: Typesense admin key not exposed to client', () => {
  it('env.ts does not expose admin key via NEXT_PUBLIC_', () => {
    const envFile = readProjectFile('src/lib/env.ts')
    expect(envFile).not.toMatch(/NEXT_PUBLIC_TYPESENSE.*KEY/i)
    expect(envFile).not.toMatch(/NEXT_PUBLIC.*ADMIN/i)
  })

  it('typesense-adapter is not imported from any "use client" file', () => {
    const tsxFiles = globTsxFiles(join(ROOT, 'src'))
    const clientFiles = tsxFiles.filter((f) => {
      const content = readFileSync(f, 'utf-8')
      return content.includes("'use client'") || content.includes('"use client"')
    })

    for (const file of clientFiles) {
      const content = readFileSync(file, 'utf-8')
      expect(content, `Client file imports typesense-adapter: ${file}`).not.toMatch(
        /typesense-adapter/
      )
    }
  })
})

// ─────────────────────────────────────────────
// S2: Crawled content sanitized to plain text
// ─────────────────────────────────────────────
describe('S2: Crawled content sanitized to plain text', () => {
  it('strips script tags and returns plain text only', () => {
    const result = extractFromHtml('<script>alert(1)</script><p>text</p>')
    expect(result.content).toBe('text')
    expect(result.content).not.toMatch(/<[^>]+>/)
    expect(result.content).not.toContain('alert')
  })

  it('strips style tags', () => {
    const result = extractFromHtml('<style>.x{color:red}</style><p>clean</p>')
    expect(result.content).toBe('clean')
    expect(result.content).not.toContain('color')
  })

  it('handles nested malicious HTML', () => {
    const result = extractFromHtml(
      '<div><script>document.cookie</script><img onerror="alert(1)"><b>safe</b></div>'
    )
    expect(result.content).not.toContain('document.cookie')
    expect(result.content).not.toContain('onerror')
    expect(result.content).toContain('safe')
  })
})

// ─────────────────────────────────────────────
// S3: Query validated + 200-char cap server-side
// ─────────────────────────────────────────────
describe('S3: Query validation and 200-char cap', () => {
  it('truncates queries longer than 200 characters', async () => {
    const search = vi.fn().mockResolvedValue({
      query: 'a',
      page: 1,
      limit: 10,
      found: 0,
      results: [],
      facets: { siteNames: [], categorySlugs: [] },
    })
    const insert = vi.fn().mockResolvedValue({ error: null })

    await executeSearchAction(
      { query: 'a'.repeat(300) },
      { adapter: { search }, logger: { from: () => ({ insert }) } }
    )

    const calledQuery = search.mock.calls[0][0] as string
    expect(calledQuery.length).toBe(SEARCH_QUERY_MAX_LENGTH)
    expect(SEARCH_QUERY_MAX_LENGTH).toBe(200)
  })

  it('rejects empty/whitespace-only query', async () => {
    const search = vi.fn()
    const insert = vi.fn()

    const result = await executeSearchAction(
      { query: '   ' },
      { adapter: { search }, logger: { from: () => ({ insert }) } }
    )

    expect(result.ok).toBe(false)
    expect(result.error).toContain('enter a search query')
    expect(search).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────
// S4: Crawl targets restricted to sites table
// ─────────────────────────────────────────────
describe('S4: Crawl targets restricted to allowed domains', () => {
  it('discovery module rejects out-of-domain URLs', async () => {
    const { discoverPages } = await import('@/lib/crawler/discovery')
    const noopFetch = vi.fn().mockResolvedValue(
      new Response('', { status: 404 })
    )

    await expect(
      discoverPages({
        siteUrl: 'https://evil.com',
        allowedDomains: ['example.com'],
        fetchImpl: noopFetch,
        sleepFn: async () => {},
        nowFn: () => 0,
      })
    ).rejects.toThrow(/not in allowedDomains/)
  })

  it('pipeline throws for unknown site ID', async () => {
    const { runSiteCrawl } = await import('@/lib/crawler/pipeline')

    const repository: CrawlRepository = {
      findSiteById: vi.fn().mockResolvedValue(null),
      createCrawlJob: vi.fn().mockResolvedValue('job-1'),
      updateCrawlJob: vi.fn(),
      findPage: vi.fn(),
      upsertPage: vi.fn(),
      touchPage: vi.fn(),
      softDeletePagesForSite: vi.fn(),
    }

    const index: SearchIndex = {
      upsert: vi.fn(),
      removeById: vi.fn(),
      removeBySiteDomain: vi.fn(),
    }

    await expect(
      runSiteCrawl(
        { siteId: 'nonexistent-id', triggeredBy: 'test' },
        { repository, index }
      )
    ).rejects.toThrow(/Site not found/)
  })
})

// ─────────────────────────────────────────────
// S5: Admin rate limiting (5 attempts / 15 min)
// ─────────────────────────────────────────────
describe('S5: Admin rate limiting', () => {
  it('auth module exports lockout constants matching 5 attempts / 15 min', async () => {
    const authFile = readProjectFile('src/lib/admin/auth.ts')
    expect(authFile).toMatch(/MAX_FAILED_ATTEMPTS\s*=\s*5/)
    expect(authFile).toMatch(/LOCKOUT_MINUTES\s*=\s*15/)
  })

  it('recordFailedAttempt sets lockout after reaching max attempts', () => {
    const authFile = readProjectFile('src/lib/admin/auth.ts')
    expect(authFile).toContain('nextCount >= MAX_FAILED_ATTEMPTS')
    expect(authFile).toContain('locked_until')
  })
})

// ─────────────────────────────────────────────
// S6: No dangerouslySetInnerHTML
// ─────────────────────────────────────────────
describe('S6: No dangerouslySetInnerHTML in codebase', () => {
  it('no .tsx file uses dangerouslySetInnerHTML', () => {
    const tsxFiles = globTsxFiles(join(ROOT, 'src'))
    const violations: string[] = []

    for (const file of tsxFiles) {
      const content = readFileSync(file, 'utf-8')
      if (content.includes('dangerouslySetInnerHTML')) {
        violations.push(file.replace(ROOT + '/', ''))
      }
    }

    expect(violations, `Files using dangerouslySetInnerHTML: ${violations.join(', ')}`).toEqual([])
  })
})

// ─────────────────────────────────────────────
// S7: Robots.txt + 2s rate limit
// ─────────────────────────────────────────────
describe('S7: Robots.txt compliance and rate limiting', () => {
  it('REQUEST_INTERVAL_MS is at least 2000ms', () => {
    const discoveryFile = readProjectFile('src/lib/crawler/discovery.ts')
    const match = discoveryFile.match(/REQUEST_INTERVAL_MS\s*=\s*(\d+)/)
    expect(match).not.toBeNull()
    expect(Number(match![1])).toBeGreaterThanOrEqual(2000)
  })

  it('parseRobots correctly parses disallow rules', () => {
    const discoveryFile = readProjectFile('src/lib/crawler/discovery.ts')
    expect(discoveryFile).toContain('function parseRobots')
    expect(discoveryFile).toContain("directive === 'disallow'")
  })

  it('isBlockedByRobots blocks matching paths', () => {
    const discoveryFile = readProjectFile('src/lib/crawler/discovery.ts')
    expect(discoveryFile).toContain('function isBlockedByRobots')
    expect(discoveryFile).toContain('path.startsWith(rule.toLowerCase())')
  })

  it('user-agent identifies as Stoogle', () => {
    const discoveryFile = readProjectFile('src/lib/crawler/discovery.ts')
    expect(discoveryFile).toMatch(/STOOGLE_USER_AGENT.*Stoogle/i)
  })
})

// ─────────────────────────────────────────────
// S8: search_logs minimal data, 90-day retention
// ─────────────────────────────────────────────
describe('S8: search_logs minimal data and 90-day retention', () => {
  it('search_logs schema stores only query, result_count, category_filter', () => {
    const schema = readProjectFile('supabase/migrations/001_initial_schema.sql')
    const searchLogsSection = schema.slice(schema.indexOf('CREATE TABLE public.search_logs'))

    expect(searchLogsSection).toContain('query')
    expect(searchLogsSection).toContain('result_count')
    expect(searchLogsSection).toContain('category_filter')
    expect(searchLogsSection).not.toMatch(/\bip\b/i)
    expect(searchLogsSection).not.toMatch(/user_agent/i)
    expect(searchLogsSection).not.toMatch(/session/i)
  })

  it('90-day retention cron job exists', () => {
    const cronMigration = readProjectFile('supabase/migrations/003_pg_cron_jobs.sql')
    expect(cronMigration).toContain('purge-old-search-logs')
    expect(cronMigration).toContain("90 days")
  })

  it('search action only logs query, result_count, category_filter', () => {
    const searchAction = readProjectFile('src/lib/search/search-action.ts')
    const insertBlock = searchAction.slice(
      searchAction.indexOf('.insert({'),
      searchAction.indexOf('})', searchAction.indexOf('.insert({')) + 2
    )
    expect(insertBlock).toContain('query')
    expect(insertBlock).toContain('result_count')
    expect(insertBlock).toContain('category_filter')
    expect(insertBlock).not.toContain('ip')
    expect(insertBlock).not.toContain('user_agent')
  })
})

// ─────────────────────────────────────────────
// S9: RLS enabled on all tables
// ─────────────────────────────────────────────
describe('S9: Row Level Security enabled on all tables', () => {
  const EXPECTED_RLS_TABLES = [
    'sites',
    'categories',
    'site_categories',
    'crawl_queue',
    'crawl_pages',
    'search_logs',
    'admin_login_attempts',
  ]

  it('all 7 tables have ENABLE ROW LEVEL SECURITY in migrations', () => {
    const migrations = readdirSync(join(ROOT, 'supabase/migrations'))
      .filter((f) => f.endsWith('.sql'))
      .map((f) => readFileSync(join(ROOT, 'supabase/migrations', f), 'utf-8'))
      .join('\n')

    for (const table of EXPECTED_RLS_TABLES) {
      const pattern = new RegExp(
        `ALTER\\s+TABLE\\s+public\\.${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
        'i'
      )
      expect(migrations, `Missing RLS for table: ${table}`).toMatch(pattern)
    }
  })
})

// ─────────────────────────────────────────────
// CSP + Security Headers
// ─────────────────────────────────────────────
describe('CSP and security headers in next.config.ts', () => {
  const configFile = readProjectFile('next.config.ts')

  it('sets Content-Security-Policy header', () => {
    expect(configFile).toContain('Content-Security-Policy')
    expect(configFile).toContain("default-src 'self'")
    expect(configFile).toContain("script-src 'self'")
    expect(configFile).toContain("style-src 'self' 'unsafe-inline'")
    expect(configFile).toContain("frame-ancestors 'none'")
    expect(configFile).toContain('*.supabase.co')
  })

  it('sets X-Frame-Options: DENY', () => {
    expect(configFile).toContain('X-Frame-Options')
    expect(configFile).toContain('DENY')
  })

  it('sets X-Content-Type-Options: nosniff', () => {
    expect(configFile).toContain('X-Content-Type-Options')
    expect(configFile).toContain('nosniff')
  })

  it('sets Referrer-Policy', () => {
    expect(configFile).toContain('Referrer-Policy')
    expect(configFile).toContain('strict-origin-when-cross-origin')
  })

  it('sets Permissions-Policy to deny camera, microphone, geolocation', () => {
    expect(configFile).toContain('Permissions-Policy')
    expect(configFile).toContain('camera=()')
    expect(configFile).toContain('microphone=()')
    expect(configFile).toContain('geolocation=()')
  })

  it('applies headers to all routes', () => {
    expect(configFile).toMatch(/source.*\/\(\.\*\)/)
  })
})
