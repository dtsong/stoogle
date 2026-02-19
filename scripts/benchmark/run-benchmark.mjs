import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import Typesense from 'typesense'

function parseArg(name, fallback) {
  const arg = process.argv.find((value) => value.startsWith(`--${name}=`))
  if (!arg) return fallback
  return arg.slice(name.length + 3)
}

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return

  const contents = fs.readFileSync(envPath, 'utf8')
  for (const line of contents.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex <= 0) continue
    const key = trimmed.slice(0, separatorIndex).trim()
    const value = trimmed.slice(separatorIndex + 1).trim()
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

function p95(values) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)
  return sorted[index]
}

async function main() {
  loadEnvLocal()

  const phase = parseArg('phase', '0')
  const fixturePath = path.join(process.cwd(), 'tests/fixtures/benchmark-queries.json')
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'))
  const key = phase === '1' ? 'phase1' : 'phase0'
  const queries = fixture[key]
  const relevanceOutputPath = parseArg('output', '')

  if (!Array.isArray(queries) || queries.length === 0) {
    throw new Error(`No benchmark queries configured for ${key}`)
  }

  const host = requiredAny(['TYPESENSE_HOST', 'NEXT_PUBLIC_TYPESENSE_HOST'])
  const apiKey = requiredAny(['TYPESENSE_SEARCH_API_KEY', 'TYPESENSE_API_KEY'])

  const client = new Typesense.Client({
    nodes: [parseNode(host)],
    apiKey,
    connectionTimeoutSeconds: 10,
  })

  const results = []
  const latencies = []

  for (const item of queries) {
    const start = Date.now()
    const searchResult = await client.collections('pages').documents().search({
      q: item.query,
      query_by: 'title,content',
      query_by_weights: '4,1',
      per_page: 10,
    })
    const latencyMs = Date.now() - start
    latencies.push(latencyMs)

    const resultDomains = (searchResult.hits ?? [])
      .map((hit) => hit.document.site_domain)
      .filter(Boolean)

    const expectedTopDomains = item.expectedTopDomains ?? []
    const minMatchCount = Number(item.minMatchCount ?? 1)
    const matchedCount = expectedTopDomains.filter((domain) => resultDomains.includes(domain)).length
    const matched = matchedCount >= minMatchCount

    results.push({
      query: item.query,
      expectedTopDomains,
      minMatchCount,
      matchedCount,
      resultDomains,
      found: searchResult.found,
      latencyMs,
      pass: matched,
    })
  }

  const summary = {
    phase: key,
    total: results.length,
    passed: results.filter((item) => item.pass).length,
    zeroResults: results.filter((item) => item.found === 0).length,
    p95LatencyMs: p95(latencies),
    results,
  }

  console.log(JSON.stringify(summary, null, 2))

  if (relevanceOutputPath) {
    fs.writeFileSync(relevanceOutputPath, `${JSON.stringify(summary, null, 2)}\n`)
  }

  if (summary.passed !== summary.total || summary.zeroResults > 0) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
