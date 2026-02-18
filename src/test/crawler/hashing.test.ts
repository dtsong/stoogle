import { describe, expect, it } from 'vitest'
import {
  buildCrawlPageUpdate,
  compareContentHashes,
  computeContentHash,
  shouldRemoveFromIndex,
} from '@/lib/crawler/hashing'

describe('computeContentHash', () => {
  it('computes deterministic SHA-256 hash', () => {
    const h1 = computeContentHash('grace and truth')
    const h2 = computeContentHash('grace and truth')
    const h3 = computeContentHash('grace and truth!')

    expect(h1).toBe(h2)
    expect(h1).not.toBe(h3)
    expect(h1).toMatch(/^[a-f0-9]{64}$/)
  })
})

describe('compareContentHashes', () => {
  it('marks changed when previous hash is missing', () => {
    const result = compareContentHashes('content', null)
    expect(result.changed).toBe(true)
    expect(result.shouldUpsert).toBe(true)
  })

  it('marks unchanged when hashes match', () => {
    const hash = computeContentHash('same content')
    const result = compareContentHashes('same content', hash)

    expect(result.changed).toBe(false)
    expect(result.shouldUpsert).toBe(false)
  })

  it('marks changed when hashes differ', () => {
    const hash = computeContentHash('old')
    const result = compareContentHashes('new', hash)

    expect(result.changed).toBe(true)
    expect(result.shouldUpsert).toBe(true)
  })
})

describe('shouldRemoveFromIndex', () => {
  it('returns true for 404 and 410', () => {
    expect(shouldRemoveFromIndex(404)).toBe(true)
    expect(shouldRemoveFromIndex(410)).toBe(true)
  })

  it('returns false for non-removal statuses', () => {
    expect(shouldRemoveFromIndex(200)).toBe(false)
    expect(shouldRemoveFromIndex(500)).toBe(false)
    expect(shouldRemoveFromIndex(null)).toBe(false)
  })
})

describe('buildCrawlPageUpdate', () => {
  it('updates last_crawled_at even when content unchanged', () => {
    const content = 'unchanged'
    const previousHash = computeContentHash(content)

    const update = buildCrawlPageUpdate({
      content,
      previousHash,
      nowIso: '2026-02-18T00:00:00.000Z',
      status: 200,
    })

    expect(update.shouldUpsert).toBe(false)
    expect(update.lastCrawledAt).toBe('2026-02-18T00:00:00.000Z')
    expect(update.httpStatus).toBe(200)
  })
})
