import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { seedPhase0Data } from '@/lib/seed/phase0'

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return

  const contents = fs.readFileSync(envPath, 'utf8')
  for (const line of contents.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const sep = trimmed.indexOf('=')
    if (sep <= 0) continue
    const key = trimmed.slice(0, sep).trim()
    const value = trimmed.slice(sep + 1).trim()
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

const runIntegration = process.env.RUN_SUPABASE_INTEGRATION === '1'
const describeIntegration = runIntegration ? describe : describe.skip

describeIntegration('phase0 seed integration', () => {
  it('seeds 10 sites, 6 categories, and site_category mappings', async () => {
    loadEnvLocal()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase credentials for integration test')
    }

    const client = createClient(supabaseUrl, serviceRoleKey)
    await seedPhase0Data(client)

    const { count: siteCount } = await client.from('sites').select('*', { count: 'exact', head: true })
    const { count: categoryCount } = await client
      .from('categories')
      .select('*', { count: 'exact', head: true })
    const { count: mappingCount } = await client
      .from('site_categories')
      .select('*', { count: 'exact', head: true })

    expect(siteCount).toBeGreaterThanOrEqual(10)
    expect(categoryCount).toBeGreaterThanOrEqual(6)
    expect(mappingCount).toBeGreaterThan(0)
  })
})
