import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import Typesense from 'typesense'

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fsSync.existsSync(envPath)) return

  const content = fsSync.readFileSync(envPath, 'utf8')
  for (const line of content.split('\n')) {
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
    const value = process.env[name]
    if (value) return value
  }

  throw new Error(`Missing required environment variable: ${names.join(' or ')}`)
}

function parseNode(url) {
  const normalizedUrl = url.includes('://') ? url : `https://${url}`
  const parsed = new URL(normalizedUrl)
  const protocol = parsed.protocol === 'http:' ? 'http' : 'https'
  const port = parsed.port ? Number(parsed.port) : protocol === 'https' ? 443 : 80

  return {
    host: parsed.hostname,
    port,
    protocol,
  }
}

async function readSchema() {
  const schemaPath = path.join(process.cwd(), 'infra/typesense/schema/pages.collection.json')
  const file = await fs.readFile(schemaPath, 'utf8')
  return JSON.parse(file)
}

async function main() {
  loadEnvLocal()

  const host = requiredAny(['TYPESENSE_HOST', 'NEXT_PUBLIC_TYPESENSE_HOST'])
  const adminKey = requiredAny(['TYPESENSE_ADMIN_API_KEY', 'TYPESENSE_API_KEY'])
  const schema = await readSchema()

  const client = new Typesense.Client({
    nodes: [parseNode(host)],
    apiKey: adminKey,
    connectionTimeoutSeconds: 10,
  })

  try {
    await client.collections(schema.name).retrieve()
    console.log(`Typesense collection '${schema.name}' already exists.`)
    return
  } catch {
    await client.collections().create(schema)
    console.log(`Created Typesense collection '${schema.name}'.`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
