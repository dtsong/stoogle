import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('soft-delete policy migration', () => {
  it('defines 7-day purge cron for crawl_pages', () => {
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/003_pg_cron_jobs.sql')
    const sql = fs.readFileSync(migrationPath, 'utf8')

    expect(sql).toContain('DELETE FROM public.crawl_pages')
    expect(sql).toContain("deleted_at < NOW() - INTERVAL '7 days'")
  })
})
