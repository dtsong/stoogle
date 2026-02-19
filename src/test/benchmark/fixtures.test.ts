import benchmarkFixture from '../../../tests/fixtures/benchmark-queries.json'
import { describe, expect, it } from 'vitest'

describe('benchmark query fixtures', () => {
  it('includes 5 phase0 benchmark queries', () => {
    expect(benchmarkFixture.phase0).toHaveLength(5)
  })

  it('phase0 entries have query, expected domains, and threshold', () => {
    for (const entry of benchmarkFixture.phase0) {
      expect(entry.query).toBeTruthy()
      expect(Array.isArray(entry.expectedTopDomains)).toBe(true)
      expect(entry.expectedTopDomains.length).toBeGreaterThan(0)
      expect(typeof entry.minMatchCount).toBe('number')
      expect(entry.minMatchCount).toBeGreaterThan(0)
    }
  })

  it('phase1 fixture includes 20 benchmark queries', () => {
    expect(Array.isArray(benchmarkFixture.phase1)).toBe(true)
    expect(benchmarkFixture.phase1.length).toBe(20)
  })
})
