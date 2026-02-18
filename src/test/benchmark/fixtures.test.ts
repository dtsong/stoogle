import benchmarkFixture from '../../../tests/fixtures/benchmark-queries.json'
import { describe, expect, it } from 'vitest'

describe('benchmark query fixtures', () => {
  it('includes 5 phase0 benchmark queries', () => {
    expect(benchmarkFixture.phase0).toHaveLength(5)
  })

  it('phase0 entries have query and expected domains', () => {
    for (const entry of benchmarkFixture.phase0) {
      expect(entry.query).toBeTruthy()
      expect(Array.isArray(entry.expectedDomains)).toBe(true)
      expect(entry.expectedDomains.length).toBeGreaterThan(0)
    }
  })

  it('initial phase1 fixture exists for later expansion', () => {
    expect(Array.isArray(benchmarkFixture.phase1)).toBe(true)
  })
})
