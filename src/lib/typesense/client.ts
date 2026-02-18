import Typesense from 'typesense'
import { env } from '@/lib/env'

type NodeConfig = {
  host: string
  port: number
  protocol: 'http' | 'https'
}

function parseNode(url: string): NodeConfig {
  const normalizedUrl = url.includes('://') ? url : `https://${url}`
  const parsed = new URL(normalizedUrl)
  const protocol = parsed.protocol === 'http:' ? 'http' : 'https'
  const port = parsed.port ? Number(parsed.port) : protocol === 'https' ? 443 : 80

  if (!parsed.hostname) {
    throw new Error(`Invalid TYPESENSE_HOST: ${url}`)
  }

  return {
    host: parsed.hostname,
    port,
    protocol,
  }
}

function createClient(apiKey: string) {
  return new Typesense.Client({
    nodes: [parseNode(env.typesense.host)],
    apiKey,
    connectionTimeoutSeconds: 10,
  })
}

export function createTypesenseAdminClient() {
  return createClient(env.typesense.adminApiKey)
}

export function createTypesenseSearchClient() {
  return createClient(env.typesense.searchApiKey)
}
