import { createHash } from 'node:crypto'

export type CrawlPageRecord = {
  contentHash: string | null
  lastCrawledAt: string | null
  httpStatus: number | null
}

export type CrawlComparison = {
  nextHash: string
  changed: boolean
  shouldUpsert: boolean
}

export function computeContentHash(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex')
}

export function compareContentHashes(
  content: string,
  previousHash: string | null | undefined
): CrawlComparison {
  const nextHash = computeContentHash(content)
  const changed = !previousHash || previousHash !== nextHash

  return {
    nextHash,
    changed,
    shouldUpsert: changed,
  }
}

export function shouldRemoveFromIndex(status: number | null | undefined): boolean {
  return status === 404 || status === 410
}

export function buildCrawlPageUpdate(params: {
  content: string
  previousHash: string | null | undefined
  nowIso: string
  status: number | null
}) {
  const comparison = compareContentHashes(params.content, params.previousHash)

  return {
    contentHash: comparison.nextHash,
    changed: comparison.changed,
    shouldUpsert: comparison.shouldUpsert,
    lastCrawledAt: params.nowIso,
    httpStatus: params.status,
  }
}
