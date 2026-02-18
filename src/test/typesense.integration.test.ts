import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { createTypesenseAdminClient } from '@/lib/typesense/client'
import { TYPESENSE_PAGES_COLLECTION } from '@/lib/typesense/schema'

function loadLocalEnvFile() {
  const filePath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(filePath)) return

  const content = fs.readFileSync(filePath, 'utf8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf('=')
    if (separator === -1) continue

    const key = trimmed.slice(0, separator).trim()
    const value = trimmed.slice(separator + 1).trim()
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

loadLocalEnvFile()

const runIntegration = process.env.RUN_TYPESENSE_INTEGRATION === '1'
const describeIntegration = runIntegration ? describe : describe.skip

describeIntegration('typesense integration', () => {
  it('can retrieve or create the pages collection schema', async () => {
    const client = createTypesenseAdminClient()

    try {
      const collection = await client
        .collections(TYPESENSE_PAGES_COLLECTION.name)
        .retrieve()

      expect(collection.name).toBe(TYPESENSE_PAGES_COLLECTION.name)
    } catch {
      const created = await client.collections().create(TYPESENSE_PAGES_COLLECTION)
      expect(created.name).toBe(TYPESENSE_PAGES_COLLECTION.name)
    }
  })
})
