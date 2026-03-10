import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import Typesense from 'typesense'

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return

  const contents = fs.readFileSync(envPath, 'utf8')
  for (const line of contents.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf('=')
    if (separator <= 0) continue
    const key = trimmed.slice(0, separator).trim()
    const value = trimmed.slice(separator + 1).trim()
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

function requiredAny(names) {
  for (const name of names) {
    if (process.env[name]) return process.env[name]
  }
  throw new Error(`Missing required environment variable: ${names.join(' or ')}`)
}

function parseNode(url) {
  const normalized = url.includes('://') ? url : `https://${url}`
  const parsed = new URL(normalized)
  const protocol = parsed.protocol === 'http:' ? 'http' : 'https'
  const port = parsed.port ? Number(parsed.port) : protocol === 'https' ? 443 : 80

  return {
    host: parsed.hostname,
    port,
    protocol,
  }
}

async function main() {
  loadEnvLocal()

  const supabaseUrl = requiredAny(['NEXT_PUBLIC_SUPABASE_URL'])
  const serviceRoleKey = requiredAny(['SUPABASE_SERVICE_ROLE_KEY'])
  const typesenseHost = requiredAny(['TYPESENSE_HOST', 'NEXT_PUBLIC_TYPESENSE_HOST'])
  const typesenseKey = requiredAny(['TYPESENSE_SEARCH_API_KEY', 'TYPESENSE_API_KEY'])

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const typesense = new Typesense.Client({
    nodes: [parseNode(typesenseHost)],
    apiKey: typesenseKey,
    connectionTimeoutSeconds: 10,
  })

  const seed = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'supabase/seeds/phase1.seed.json'), 'utf8'))
  const expectedDomains = seed.sites.map((site) => new URL(site.url).hostname.toLowerCase())

  const [{ count: activeSiteCount }, { data: jobs }, { data: sites }] = await Promise.all([
    supabase.from('sites').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase
      .from('crawl_queue')
      .select('site_id,status,url,error,updated_at,attempted_at')
      .order('updated_at', { ascending: false })
      .limit(500),
    supabase.from('sites').select('id,url,name').eq('is_active', true).limit(200),
  ])

  const facetResult = await typesense.collections('pages').documents().search({
    q: '*',
    query_by: 'title,content',
    per_page: 0,
    facet_by: 'site_domain',
    max_facet_values: 200,
  })

  const domainFacets = facetResult.facet_counts?.find((facet) => facet.field_name === 'site_domain')
  const indexedDomains = new Set((domainFacets?.counts ?? []).map((entry) => entry.value))

  const completedJobs = (jobs ?? []).filter((job) => job.status === 'completed').length
  const missingIndexedDomains = expectedDomains.filter((domain) => !indexedDomains.has(domain))

  const siteByDomain = new Map(
    (sites ?? []).map((site) => [new URL(site.url).hostname.toLowerCase(), site])
  )

  const latestJobBySiteId = new Map()
  for (const job of jobs ?? []) {
    if (!latestJobBySiteId.has(job.site_id)) {
      latestJobBySiteId.set(job.site_id, job)
    }
  }

  const missingDomainDiagnostics = await Promise.all(
    missingIndexedDomains.map(async (domain) => {
      const site = siteByDomain.get(domain)
      const latestJob = site ? latestJobBySiteId.get(site.id) : null

      let crawlPageCount = 0
      if (site) {
        const { count } = await supabase
          .from('crawl_pages')
          .select('*', { count: 'exact', head: true })
          .eq('site_id', site.id)
          .is('deleted_at', null)

        crawlPageCount = count ?? 0
      }

      return {
        domain,
        siteId: site?.id ?? null,
        siteName: site?.name ?? null,
        siteUrl: site?.url ?? null,
        crawlPageCount,
        latestJobStatus: latestJob?.status ?? null,
        latestJobError: latestJob?.error ?? null,
        latestJobUpdatedAt: latestJob?.updated_at ?? null,
        latestJobAttemptedAt: latestJob?.attempted_at ?? null,
      }
    })
  )

  const summary = {
    activeSiteCount,
    expectedSiteCount: expectedDomains.length,
    completedJobs,
    indexedDomainCount: indexedDomains.size,
    missingIndexedDomains,
    missingDomainDiagnostics,
    totalDocuments: facetResult.found,
  }

  console.log(JSON.stringify(summary, null, 2))

  if (activeSiteCount < 45 || completedJobs < 45 || missingIndexedDomains.length > 0) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
