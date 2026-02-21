import { readFileSync, existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * Deployment readiness tests.
 * Verify all required files and configuration exist for production deployment.
 */

describe('deployment: environment configuration', () => {
  it('.env.example documents all required variables', () => {
    const envExample = readFileSync('.env.example', 'utf8')
    expect(envExample).toContain('NEXT_PUBLIC_SUPABASE_URL')
    expect(envExample).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    expect(envExample).toContain('SUPABASE_SERVICE_ROLE_KEY')
    expect(envExample).toContain('TYPESENSE_HOST')
    expect(envExample).toContain('TYPESENSE_API_KEY')
    expect(envExample).toContain('NEXT_PUBLIC_SENTRY_DSN')
    expect(envExample).toContain('CRON_SECRET')
  })

  it('.env files are gitignored', () => {
    const gitignore = readFileSync('.gitignore', 'utf8')
    expect(gitignore).toContain('.env')
  })
})

describe('deployment: application structure', () => {
  it('next.config.ts exists with security headers', () => {
    const config = readFileSync('next.config.ts', 'utf8')
    expect(config).toContain('Content-Security-Policy')
    expect(config).toContain('headers')
  })

  it('vercel.json exists with cron configuration', () => {
    expect(existsSync('vercel.json')).toBe(true)
    const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'))
    expect(vercel.crons).toBeDefined()
    expect(vercel.crons.length).toBeGreaterThan(0)
  })

  it('package.json has build script', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
    expect(pkg.scripts.build).toBeDefined()
  })
})

describe('deployment: monitoring and error tracking', () => {
  it('Sentry client config exists', () => {
    expect(existsSync('sentry.client.config.ts')).toBe(true)
  })

  it('health endpoint exists for uptime monitoring', () => {
    expect(existsSync('src/app/api/health/search/route.ts')).toBe(true)
  })

  it('global error boundary exists', () => {
    expect(existsSync('src/app/global-error.tsx')).toBe(true)
  })
})

describe('deployment: database migrations', () => {
  it('all migrations exist in order', () => {
    expect(existsSync('supabase/migrations/001_initial_schema.sql')).toBe(true)
    expect(existsSync('supabase/migrations/002_rls_policies.sql')).toBe(true)
    expect(existsSync('supabase/migrations/003_pg_cron_jobs.sql')).toBe(true)
    expect(existsSync('supabase/migrations/004_admin_auth.sql')).toBe(true)
    expect(existsSync('supabase/migrations/005_analytics_columns.sql')).toBe(true)
  })
})

describe('deployment: launch checklist', () => {
  it('CI workflow runs on PRs and main', () => {
    const ci = readFileSync('.github/workflows/ci.yml', 'utf8')
    expect(ci).toContain('pull_request')
    expect(ci).toContain('main')
  })

  it('search action has server-side query validation', () => {
    const action = readFileSync('src/lib/search/search-action.ts', 'utf8')
    expect(action).toContain('SEARCH_QUERY_MAX_LENGTH')
    expect(action).toContain('sanitizeQuery')
  })

  it('analytics click tracking is in place', () => {
    expect(existsSync('src/lib/analytics/click-action.ts')).toBe(true)
    expect(existsSync('src/lib/analytics/metrics.ts')).toBe(true)
  })
})
