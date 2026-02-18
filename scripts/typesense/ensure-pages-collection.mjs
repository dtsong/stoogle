import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import Typesense from 'typesense'

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
